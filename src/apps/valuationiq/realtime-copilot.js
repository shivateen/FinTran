/* ============================================================================
 * realtime-copilot.js — OpenAI Realtime (WebRTC) browser client
 * ----------------------------------------------------------------------------
 * Owns the live voice/text channel to OpenAI's Realtime API for the FinTran CFO
 * valuation co-pilot. It does NOT compute any finance number — it only carries
 * the model's tool *intents* out to the host app (via callbacks.onToolCall),
 * sends the deterministic result back, and asks the model to narrate.
 *
 * Wire flow (see VOICE_MODULE_SPEC §2 / contract §4):
 *   1. GET tokenEndpoint           → ephemeral client secret (BYOK header optional)
 *   2. new RTCPeerConnection       + <audio autoplay> for model speech
 *   3. mic track (or recvonly)     + createDataChannel('oai-events')
 *   4. SDP offer → POST DIRECT to  https://api.openai.com/v1/realtime/calls
 *   5. setRemoteDescription(answer)
 *   6. dc.onopen → session.update  { instructions, tools, tool_choice:'auto' }
 *   7. dc.onmessage → transcripts / streaming text / function calls
 *   8. tool call   → onToolCall → function_call_output + response.create
 *
 * Loaded as a plain <script> (no bundler). Exposes window.RealtimeCopilot.
 * Also guards module.exports for Node test harnesses.
 * ==========================================================================*/
(function (root) {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────
  var API_BASE = 'https://api.openai.com'; // media/SDP exchange goes DIRECT here
  var DATA_CHANNEL = 'oai-events';
  var TRANSCRIPT_TAIL = 220; // streaming assistant text trimmed to last ~220 chars

  // Per-tool narration directive (contract §4 step 8 / VOICE_MODULE_SPEC §2.3).
  var NARRATION = 'Use the tool output to answer the CFO crisply. Mention the ' +
    'dashboard was updated, whether the case clears hurdle, the top dependency, ' +
    'and one suggested drill-down. Answer in English.';

  // ── Helpers ───────────────────────────────────────────────────────────────
  function noop() {}

  // Tolerant extraction of the ephemeral secret from the token payload.
  function extractSecret(payload) {
    if (!payload) return null;
    return payload.value ||
      (payload.client_secret && payload.client_secret.value) ||
      payload.client_secret ||
      payload.secret ||
      null;
  }

  function tail(text) {
    if (text == null) return '';
    var s = String(text);
    return s.length > TRANSCRIPT_TAIL ? s.slice(-TRANSCRIPT_TAIL) : s;
  }

  // ── Class ─────────────────────────────────────────────────────────────────
  function RealtimeCopilot(opts) {
    opts = opts || {};
    this.tokenEndpoint = opts.tokenEndpoint;
    this.model = opts.model;
    this.voice = opts.voice;
    this.instructions = opts.instructions;
    this.tools = opts.tools || [];
    this.contextNote = opts.contextNote || '';

    var cb = opts.callbacks || {};
    this.callbacks = {
      onStatus: typeof cb.onStatus === 'function' ? cb.onStatus : noop,
      onUserTranscript: typeof cb.onUserTranscript === 'function' ? cb.onUserTranscript : noop,
      onAssistantText: typeof cb.onAssistantText === 'function' ? cb.onAssistantText : noop,
      onToolCall: typeof cb.onToolCall === 'function' ? cb.onToolCall : noop
    };

    // Live-session state.
    this.pc = null;
    this.dc = null;
    this.stream = null;       // local mic MediaStream (null in textOnly mode)
    this.audioEl = null;      // <audio autoplay> for model speech
    this.pendingCalls = new Map(); // call_id -> { name, args, executed }
    this.assistantBuffer = ''; // accumulated streaming assistant text
    this.muted = false;
    this.isLive = false;
  }

  // ── Internal: status passthrough ──────────────────────────────────────────
  RealtimeCopilot.prototype._status = function (state) {
    try { this.callbacks.onStatus(state); } catch (e) { /* swallow callback errors */ }
  };

  // ── Internal: send a JSON event over the data channel ─────────────────────
  RealtimeCopilot.prototype._send = function (event) {
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(event));
      return true;
    }
    // Tolerate a mock channel without readyState in tests.
    if (this.dc && typeof this.dc.send === 'function' && this.dc.readyState === undefined) {
      this.dc.send(JSON.stringify(event));
      return true;
    }
    return false;
  };

  // ── connect() ─────────────────────────────────────────────────────────────
  // textOnly:true => data channel only, NO getUserMedia/mic (recvonly audio).
  RealtimeCopilot.prototype.connect = function (cfg) {
    cfg = cfg || {};
    var textOnly = !!cfg.textOnly;
    var self = this;

    return Promise.resolve().then(function () {
      self._status('connecting');

      // 1. Mint the ephemeral token. Forward a browser-side BYOK key if present.
      var headers = {};
      try {
        if (typeof sessionStorage !== 'undefined') {
          var byok = sessionStorage.getItem('OPENAI_KEY');
          if (byok) headers['X-OpenAI-Key'] = byok;
        }
      } catch (e) { /* sessionStorage may be unavailable */ }

      return fetch(self.tokenEndpoint, { method: 'GET', headers: headers })
        .then(function (res) {
          if (!res || !res.ok) {
            throw new Error('Token request failed' + (res ? ' (' + res.status + ')' : ''));
          }
          return res.json();
        })
        .then(function (payload) {
          var ephemeral = extractSecret(payload);
          if (!ephemeral) throw new Error('No ephemeral secret in token response');
          return self._establish(ephemeral, textOnly);
        });
    }).catch(function (err) {
      self._status('error');
      // Best-effort cleanup so a failed attempt leaves no dangling resources.
      try { self.stop(); } catch (e2) { /* ignore */ }
      return Promise.reject(err);
    });
  };

  // ── Internal: build the peer connection and exchange SDP ──────────────────
  RealtimeCopilot.prototype._establish = function (ephemeral, textOnly) {
    var self = this;

    // 2. Peer connection + <audio autoplay> sink for the model's speech.
    var pc = new RTCPeerConnection();
    self.pc = pc;

    var audio = document.createElement('audio');
    audio.autoplay = true;
    self.audioEl = audio;
    if (document.body && document.body.appendChild) {
      document.body.appendChild(audio);
    }
    pc.ontrack = function (event) {
      if (event && event.streams && event.streams[0]) {
        audio.srcObject = event.streams[0];
      }
    };

    // 3. Mic track (or recvonly transceiver in textOnly mode).
    var micPromise;
    if (!textOnly) {
      micPromise = navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function (stream) {
          self.stream = stream;
          stream.getTracks().forEach(function (track) { pc.addTrack(track, stream); });
        });
    } else {
      // Still want to HEAR responses — add a recvonly audio transceiver, no mic.
      if (typeof pc.addTransceiver === 'function') {
        pc.addTransceiver('audio', { direction: 'recvonly' });
      }
      micPromise = Promise.resolve();
    }

    return micPromise.then(function () {
      // 4. Data channel carries all JSON events.
      var dc = pc.createDataChannel(DATA_CHANNEL);
      self.dc = dc;
      dc.onopen = function () { self._onDataChannelOpen(); };
      dc.onmessage = function (event) { self._onMessage(event); };
      dc.onerror = function () { self._status('error'); };

      // 5. SDP offer.
      return pc.createOffer();
    }).then(function (offer) {
      return Promise.resolve(pc.setLocalDescription(offer)).then(function () { return offer; });
    }).then(function (offer) {
      // 5b. POST the offer DIRECT to OpenAI (not the token endpoint).
      var url = API_BASE + '/v1/realtime/calls?model=' + encodeURIComponent(self.model);
      return fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + ephemeral,
          'Content-Type': 'application/sdp'
        },
        body: offer.sdp
      });
    }).then(function (res) {
      if (!res || !res.ok) {
        throw new Error('SDP exchange failed' + (res ? ' (' + res.status + ')' : ''));
      }
      return res.text();
    }).then(function (answerSdp) {
      // 5c. Apply the answer.
      return pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    }).then(function () {
      self.isLive = true;
      // Status flips to 'listening' on dc.onopen; mark connected meanwhile.
      return self;
    });
  };

  // ── dc.onopen ─────────────────────────────────────────────────────────────
  // The token's session config already carries instructions + tools (the primary
  // path). We re-assert them here as a harmless reinforcement — but ONLY with
  // valid session fields (no `audio` key: the GA API rejects the whole update if
  // it sees an unexpected field, which would drop tools + instructions).
  RealtimeCopilot.prototype._onDataChannelOpen = function () {
    if (this.tools || this.instructions) {
      this._send({
        type: 'session.update',
        session: {
          instructions: this.instructions,
          tools: this.tools,
          tool_choice: 'auto'
        }
      });
    }
    this._status('listening');
    // Ground the model in the on-screen case so its first answers use real numbers.
    if (this.contextNote) {
      this._send({
        type: 'conversation.item.create',
        item: { type: 'message', role: 'user',
          content: [{ type: 'input_text', text: this.contextNote }] }
      });
    }
    // Deterministic English opener instead of an uncontrolled (possibly foreign) greeting.
    this._send({
      type: 'response.create',
      response: {
        modalities: ['audio', 'text'],
        instructions: 'Greet the CFO in one brief English sentence and invite a question. English only.'
      }
    });
  };

  // ── dc.onmessage: inbound event router (VOICE_MODULE_SPEC §2.2) ────────────
  RealtimeCopilot.prototype._onMessage = function (event) {
    var msg;
    try {
      msg = JSON.parse(event && event.data);
    } catch (e) {
      return; // ignore non-JSON frames
    }
    if (!msg || !msg.type) return;
    var self = this;

    switch (msg.type) {
      // --- CFO (user) transcript ------------------------------------------
      case 'conversation.item.input_audio_transcription.completed':
        this.assistantBuffer = '';
        this.callbacks.onUserTranscript(msg.transcript || '');
        this._status('thinking');
        break;

      // --- streaming assistant text ---------------------------------------
      case 'response.audio_transcript.delta':
      case 'response.text.delta':
        this.assistantBuffer += (msg.delta || '');
        this.callbacks.onAssistantText(tail(this.assistantBuffer), { final: false });
        break;

      // --- assistant text finalized ---------------------------------------
      case 'response.audio_transcript.done':
      case 'response.text.done':
      case 'response.done': {
        var finalText = (typeof msg.transcript === 'string' && msg.transcript) ||
          (typeof msg.text === 'string' && msg.text) ||
          this.assistantBuffer;
        this.callbacks.onAssistantText(finalText || '', { final: true });
        this.assistantBuffer = '';
        this._status('listening');
        break;
      }

      // --- tool call: accumulate partial args by call_id ------------------
      case 'response.function_call_arguments.delta': {
        var dId = msg.call_id;
        if (!dId) break;
        var entry = this.pendingCalls.get(dId) || { name: msg.name, args: '', executed: false };
        if (msg.name) entry.name = msg.name;
        entry.args += (msg.delta || '');
        this.pendingCalls.set(dId, entry);
        break;
      }

      // --- tool call: args complete ---------------------------------------
      case 'response.function_call_arguments.done': {
        var doneId = msg.call_id;
        if (!doneId) break;
        var pc = this.pendingCalls.get(doneId) || { name: msg.name, args: '', executed: false };
        var name = msg.name || pc.name;
        var argsText = (typeof msg.arguments === 'string' && msg.arguments) || pc.args || '';
        this.executeTool(doneId, name, argsText);
        break;
      }

      // --- alternate completion path: output_item.done(function_call) -----
      case 'response.output_item.done': {
        var item = msg.item;
        if (item && item.type === 'function_call') {
          var oid = item.call_id || item.id;
          if (oid) {
            this.executeTool(oid, item.name, item.arguments || '');
          }
        }
        break;
      }

      // --- audio bytes are handled by the media track — ignore here -------
      case 'response.audio.delta':
      case 'response.audio.done':
        break;

      // --- errors ----------------------------------------------------------
      case 'error':
        this._status('error');
        break;

      default:
        // Unhandled event types are ignored.
        break;
    }
  };

  // ── executeTool: run the host handler, send result + ask model to speak ──
  RealtimeCopilot.prototype.executeTool = function (call_id, name, argsText) {
    if (!call_id || !name) return; // ignore missing call_id / unknown tool

    // Guard against double-execution (done + output_item.done both fire).
    var entry = this.pendingCalls.get(call_id) || { name: name, args: argsText, executed: false };
    if (entry.executed) return;
    entry.executed = true;
    entry.name = name;
    this.pendingCalls.set(call_id, entry);

    var self = this;

    // Parse args tolerantly (default {}).
    var args = {};
    try {
      if (argsText && String(argsText).trim()) args = JSON.parse(argsText);
    } catch (e) {
      args = {};
    }

    this._status('thinking');

    // onToolCall may return a value or a Promise.
    Promise.resolve()
      .then(function () { return self.callbacks.onToolCall(name, args); })
      .then(function (result) {
        // 1. Hand the deterministic result back to the model.
        self._send({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: call_id,
            output: JSON.stringify(result == null ? {} : result)
          }
        });
        // 2. Ask the model to narrate the just-updated dashboard.
        self._send({
          type: 'response.create',
          response: {
            modalities: ['audio', 'text'],
            instructions: NARRATION
          }
        });
        self._status('speaking');
      })
      .catch(function () {
        // A failing handler must not kill the session.
        self._status('error');
      });
  };

  // ── sendText: inject a typed user turn (chat box) ─────────────────────────
  RealtimeCopilot.prototype.sendText = function (text) {
    if (text == null) return;
    this._send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: String(text) }]
      }
    });
    this._send({
      type: 'response.create',
      response: { modalities: ['audio', 'text'] }
    });
    // Mirror into the chat UI so the typed turn shows up immediately.
    this.callbacks.onUserTranscript(String(text));
    this._status('thinking');
  };

  // ── mute / unmute: toggle local mic without ending the session ────────────
  RealtimeCopilot.prototype.mute = function () { this._setMicEnabled(false); };
  RealtimeCopilot.prototype.unmute = function () { this._setMicEnabled(true); };

  RealtimeCopilot.prototype._setMicEnabled = function (enabled) {
    this.muted = !enabled;
    if (this.stream && this.stream.getAudioTracks) {
      this.stream.getAudioTracks().forEach(function (track) { track.enabled = enabled; });
    } else if (this.stream && this.stream.getTracks) {
      this.stream.getTracks().forEach(function (track) { track.enabled = enabled; });
    }
  };

  // ── stop: tear the session down cleanly ───────────────────────────────────
  RealtimeCopilot.prototype.stop = function () {
    // Stop all local media tracks.
    if (this.stream && this.stream.getTracks) {
      this.stream.getTracks().forEach(function (track) {
        try { track.stop(); } catch (e) { /* ignore */ }
      });
    }
    this.stream = null;

    // Close the data channel.
    if (this.dc) {
      try { this.dc.close(); } catch (e) { /* ignore */ }
      this.dc = null;
    }

    // Close the peer connection.
    if (this.pc) {
      try { this.pc.close(); } catch (e) { /* ignore */ }
      this.pc = null;
    }

    // Remove the audio element from the DOM.
    if (this.audioEl) {
      try {
        if (this.audioEl.parentNode) this.audioEl.parentNode.removeChild(this.audioEl);
      } catch (e) { /* ignore */ }
      this.audioEl = null;
    }

    this.pendingCalls = new Map();
    this.assistantBuffer = '';
    this.muted = false;
    this.isLive = false;
    this._status('closed');
  };

  // ── Exports ───────────────────────────────────────────────────────────────
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealtimeCopilot;
  }
  if (root) {
    root.RealtimeCopilot = RealtimeCopilot;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
