/**
 * Corper Wee: Authoritative Real-Time Multiplayer Gateway (WebSockets)
 * Handles:
 * - Authenticated Player Presence (HMAC-SHA256 JWT validated JOIN)
 * - Shared Spatial Coordinates across Iseyin Orientation Camp
 * - Real-time Social Interactions (Charisma checks, cartoon reactions, dialogue)
 * - Broadcast Platoon Activities & Global Notifications
 * - Automatic Reconnection & Heartbeat Ping/Pong
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HTTPServer } from 'http';
import { db } from './db/index.js';
import { parseAccessToken } from './middleware/auth.js';
import { SocialService } from './services/socialService.js';
import { NotificationService } from './services/notificationService.js';

interface PlayerSessionSocket {
  ws: WebSocket;
  userId: string;
  stateCode: string;
  displayName: string;
  platoonNumber: number;
  posX: number;
  posY: number;
  posZ: number;
  rotationY: number;
  lastPing: number;
  isAlive: boolean;
}

export class MultiplayerGateway {
  private static wss: WebSocketServer | null = null;
  private static clients: Map<string, PlayerSessionSocket> = new Map(); // userId -> PlayerSessionSocket
  private static lastJoinNotifiedAt: Map<string, number> = new Map(); // userId -> timestamp
  private static heartbeatInterval: NodeJS.Timeout | null = null;

  public static initialize(server: HTTPServer) {
    if (this.wss) return;

    NotificationService.registerBroadcaster((notification) => {
      this.broadcast({
        type: 'CAMP_NOTIFICATION',
        data: notification,
      });
    });

    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      let currentUserId: string | null = null;

      // Extract optional query token if provided at handshake
      const urlToken = (() => {
        try {
          const parsedUrl = new URL(req.url || '/ws', 'http://localhost');
          return parsedUrl.searchParams.get('token') || undefined;
        } catch {
          return undefined;
        }
      })();

      ws.on('message', (messageRaw: string) => {
        try {
          const payload = JSON.parse(messageRaw.toString());
          const { type, data } = payload;

          switch (type) {
            case 'JOIN': {
              const token = data?.token || urlToken;
              const decoded = token ? parseAccessToken(token) : null;
              if (!decoded) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'Authentication required: Invalid or missing access token in JOIN.' }));
                ws.close(4001, 'Unauthorized');
                return;
              }

              const user = db.users.get(decoded.userId);
              if (!user || user.status !== 'ACTIVE') {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'Account is suspended, deleted, or inactive.' }));
                ws.close(4003, 'Forbidden');
                return;
              }

              if (data?.userId && data.userId !== user.id) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'User identity mismatch in JOIN.' }));
                ws.close(4003, 'Forbidden');
                return;
              }

              const profile = db.playerProfiles.get(user.id);
              const userId = user.id;
              currentUserId = userId;
              const session: PlayerSessionSocket = {
                ws,
                userId,
                stateCode: user.stateCode || 'OY/26C/XXXX',
                displayName: user.displayName || 'Corper',
                platoonNumber: profile?.platoonId || Number(data?.platoonNumber) || 1,
                posX: Number.isFinite(data?.posX) ? data.posX : 0,
                posY: Number.isFinite(data?.posY) ? data.posY : 0,
                posZ: Number.isFinite(data?.posZ) ? data.posZ : 65,
                rotationY: Number.isFinite(data?.rotationY) ? data.rotationY : 0,
                lastPing: Date.now(),
                isAlive: true,
              };

              this.clients.set(userId, session);

              // 1. Send existing connected players snapshot to the new player
              const existingPlayers = Array.from(this.clients.values())
                .filter((c) => c.userId !== userId)
                .map((c) => ({
                  userId: c.userId,
                  stateCode: c.stateCode,
                  displayName: c.displayName,
                  platoonNumber: c.platoonNumber,
                  posX: c.posX,
                  posY: c.posY,
                  posZ: c.posZ,
                  rotationY: c.rotationY,
                }));

              ws.send(JSON.stringify({
                type: 'ROOM_INIT',
                data: {
                  players: existingPlayers,
                  notifications: NotificationService.getRecent(20),
                  serverTime: Date.now(),
                },
              }));

              // 2. Broadcast PLAYER_JOINED to other connected players
              this.broadcast(
                {
                  type: 'PLAYER_JOINED',
                  data: {
                    userId,
                    stateCode: session.stateCode,
                    displayName: session.displayName,
                    platoonNumber: session.platoonNumber,
                    posX: session.posX,
                    posY: session.posY,
                    posZ: session.posZ,
                    rotationY: session.rotationY,
                  },
                },
                userId
              );

              // 3. Publish live camp presence notification (throttled per user to avoid reconnect spam)
              const nowMs = Date.now();
              const lastNotified = this.lastJoinNotifiedAt.get(userId) || 0;
              if (nowMs - lastNotified > 60_000) {
                this.lastJoinNotifiedAt.set(userId, nowMs);
                NotificationService.publish({
                  category: 'CAMP_JOIN',
                  actorUserId: userId,
                  actorName: session.displayName,
                  actorStateCode: session.stateCode,
                  platoonNumber: session.platoonNumber,
                  message: `${session.displayName} joined the camp`,
                });
              }
              break;
            }

            case 'MOVE': {
              if (!currentUserId) return;
              const client = this.clients.get(currentUserId);
              if (
                client &&
                Number.isFinite(data?.x) &&
                Number.isFinite(data?.y) &&
                Number.isFinite(data?.z) &&
                Number.isFinite(data?.rotationY)
              ) {
                client.posX = data.x;
                client.posY = data.y;
                client.posZ = data.z;
                client.rotationY = data.rotationY;

                // Broadcast movement delta to all other clients
                this.broadcast(
                  {
                    type: 'PLAYER_MOVED',
                    data: {
                      userId: currentUserId,
                      x: data.x,
                      y: data.y,
                      z: data.z,
                      rotationY: data.rotationY,
                      isSprinting: !!data.isSprinting,
                    },
                  },
                  currentUserId
                );
              }
              break;
            }

            case 'SOCIAL_INTERACT': {
              if (!currentUserId) return;
              const { targetUserId, interactionType, dialogueOptionId } = data || {};
              if (typeof targetUserId !== 'string') return;
              try {
                const result = SocialService.processInteraction(
                  currentUserId,
                  targetUserId,
                  interactionType || 'GREETING',
                  dialogueOptionId
                );

                // Notify both initiator and target in real-time
                const initiatorClient = this.clients.get(currentUserId);
                const targetClient = this.clients.get(targetUserId);

                const socialPayload = {
                  type: 'SOCIAL_INTERACTION_RESULT',
                  data: {
                    initiatorUserId: currentUserId,
                    targetUserId,
                    ...result,
                  },
                };

                if (initiatorClient && initiatorClient.ws.readyState === WebSocket.OPEN) {
                  initiatorClient.ws.send(JSON.stringify(socialPayload));
                }

                if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
                  targetClient.ws.send(JSON.stringify({
                    type: 'SOCIAL_INTERACTION_RECEIVED',
                    data: {
                      initiatorUserId: currentUserId,
                      initiatorName: initiatorClient?.displayName || 'Fellow Corper',
                      ...result,
                    },
                  }));
                }
              } catch (err: any) {
                ws.send(JSON.stringify({
                  type: 'SOCIAL_ERROR',
                  message: err.message || 'Social interaction failed',
                }));
              }
              break;
            }

            case 'EMOTE': {
              if (!currentUserId) return;
              if (!['SALUTE', 'WAVE', 'CHEER'].includes(data?.emote)) return;
              this.broadcast({
                type: 'PLAYER_EMOTE',
                data: {
                  userId: currentUserId,
                  emote: data.emote,
                },
              });
              break;
            }

            case 'PONG': {
              if (currentUserId) {
                const client = this.clients.get(currentUserId);
                if (client) client.isAlive = true;
              }
              break;
            }

            default:
              break;
          }
        } catch (e) {
          console.error('[MultiplayerGateway] Message processing error:', e);
        }
      });

      ws.on('close', () => {
        if (currentUserId) {
          this.clients.delete(currentUserId);
          this.broadcast({
            type: 'PLAYER_LEFT',
            data: { userId: currentUserId },
          });
          currentUserId = null;
        }
      });

      ws.on('error', (err) => {
        console.error('[MultiplayerGateway] Socket error:', err);
      });
    });

    // Heartbeat check every 25 seconds to drop dead sockets
    this.heartbeatInterval = setInterval(() => {
      for (const [userId, client] of this.clients.entries()) {
        if (!client.isAlive) {
          client.ws.terminate();
          this.clients.delete(userId);
          this.broadcast({
            type: 'PLAYER_LEFT',
            data: { userId },
          });
          continue;
        }

        client.isAlive = false;
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({ type: 'PING' }));
        }
      }
    }, 25000);

    console.log('[MultiplayerGateway] WebSocket server attached to HTTP server on path /ws');
  }

  public static broadcast(message: object, excludeUserId?: string) {
    const raw = JSON.stringify(message);
    for (const [userId, client] of this.clients.entries()) {
      if (excludeUserId && userId === excludeUserId) continue;
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(raw);
      }
    }
  }

  public static getConnectedPlayerCount(): number {
    return this.clients.size;
  }

  public static destroy() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    NotificationService.registerBroadcaster(null);
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.clients.clear();
    this.lastJoinNotifiedAt.clear();
  }
}
