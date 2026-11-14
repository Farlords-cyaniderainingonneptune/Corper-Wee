/**
 * Corper Wee: Client Multiplayer WebSocket Service
 * Connects to ws://<host>/ws with auto-reconnect, heartbeat ping/pong,
 * position interpolation, and event dispatch.
 */

export interface RemotePlayer {
  userId: string;
  stateCode: string;
  displayName: string;
  platoonNumber: number;
  posX: number;
  posY: number;
  posZ: number;
  rotationY: number;
  isSprinting?: boolean;
}

export type MultiplayerEventHandler = (type: string, data: any) => void;

export class MultiplayerClient {
  private static instance: MultiplayerClient | null = null;
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectTimer: number | null = null;
  private listeners: Set<MultiplayerEventHandler> = new Set();
  private localPlayerData: RemotePlayer | null = null;

  public static getInstance(): MultiplayerClient {
    if (!this.instance) {
      this.instance = new MultiplayerClient();
    }
    return this.instance;
  }

  public connect(player: RemotePlayer) {
    this.localPlayerData = player;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }

        // Join room with authenticated JWT
        const token = localStorage.getItem('cw_access_token') || undefined;
        this.send('JOIN', { ...player, token });
        this.emit('CONNECTED', { wsUrl });
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'PING') {
            this.send('PONG', {});
            return;
          }
          this.emit(payload.type, payload.data || payload);
        } catch {
          // invalid json
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.emit('DISCONNECTED', {});
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        this.emit('ERROR', err);
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.localPlayerData) {
        this.connect(this.localPlayerData);
      }
    }, 3000);
  }

  public send(type: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  public sendMovement(x: number, y: number, z: number, rotationY: number, isSprinting: boolean = false) {
    this.send('MOVE', { x, y, z, rotationY, isSprinting });
  }

  public sendSocialInteract(targetUserId: string, interactionType: string = 'GREETING', dialogueOptionId?: string) {
    this.send('SOCIAL_INTERACT', { targetUserId, interactionType, dialogueOptionId });
  }

  public sendEmote(emote: 'SALUTE' | 'WAVE' | 'CHEER') {
    this.send('EMOTE', { emote });
  }

  public subscribe(handler: MultiplayerEventHandler) {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  private emit(type: string, data: any) {
    for (const listener of this.listeners) {
      try {
        listener(type, data);
      } catch (e) {
        console.error('[MultiplayerClient] Error in listener:', e);
      }
    }
  }

  public disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const multiplayerClient = MultiplayerClient.getInstance();
