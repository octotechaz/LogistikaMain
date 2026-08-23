import makeWASocket, { useMultiFileAuthState as createMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import * as path from 'path';
import * as fs from 'fs/promises';
import pino from 'pino';

function extractPhoneFromWhatsAppId(id: string | undefined | null): string | null {
    if (!id) return null;
    const match = id.match(/^(\d+)/);
    return match ? match[1] : null;
}

const AUTH_DIR = path.join(process.cwd(), 'octo-admin', 'data', 'auth_info_baileys');
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export class WhatsAppService {
    private socket: any = null;
    private status: 'connecting' | 'connected' | 'disconnected' | 'qr_ready' = 'disconnected';
    private currentQr: string | null = null;
    private connectedPhone: string | null = null;
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private isInitializing = false;

    constructor() {
        this.init().catch((err) => console.error('WhatsApp init xətası:', err));
    }

    private destroySocket() {
        if (this.socket) {
            try {
                this.socket.ev.removeAllListeners();
                this.socket.ws?.close();
            } catch (_) {}
            this.socket = null;
        }
    }

    async init() {
        if (this.isInitializing) return;
        this.isInitializing = true;

        try {
            const { state, saveCreds } = await createMultiFileAuthState(AUTH_DIR);

            this.connectedPhone = extractPhoneFromWhatsAppId(state.creds?.me?.id);
            this.status = 'connecting';

            this.destroySocket();

            this.socket = makeWASocket({
                auth: state,
                printQRInTerminal: false,
                browser: ['Logistika Panel', 'Chrome', '1.0.0'],
                logger: pino({ level: 'silent' }),
                connectTimeoutMs: 30000,
                keepAliveIntervalMs: 15000,
            });

            this.socket.ev.on('connection.update', (update: any) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    console.log('WhatsApp QR Code ready');
                    this.currentQr = qr;
                    this.status = 'qr_ready';
                }

                if (connection === 'close') {
                    const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
                    const isLoggedOut = statusCode === DisconnectReason.loggedOut;

                    this.status = 'disconnected';
                    this.currentQr = null;
                    this.connectedPhone = null;
                    this.destroySocket();

                    if (isLoggedOut) {
                        console.log('WhatsApp çıxış edildi, yenidən qoşulma dayandırıldı.');
                        this.reconnectAttempts = 0;
                        return;
                    }

                    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                        console.error(`WhatsApp ${MAX_RECONNECT_ATTEMPTS} cəhddən sonra qoşula bilmədi. Dayandırıldı.`);
                        this.reconnectAttempts = 0;
                        return;
                    }

                    this.reconnectAttempts++;
                    const delay = RECONNECT_DELAY_MS * this.reconnectAttempts;
                    console.log(`WhatsApp yenidən qoşulur... (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}, ${delay}ms sonra)`);

                    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = setTimeout(() => {
                        this.init().catch((err) => console.error('WhatsApp reconnect xətası:', err));
                    }, delay);

                } else if (connection === 'open') {
                    this.reconnectAttempts = 0;
                    this.status = 'connected';
                    this.currentQr = null;
                    this.connectedPhone = extractPhoneFromWhatsAppId(this.socket?.user?.id);
                    console.log('WhatsApp bağlantısı uğurla quruldu!', this.connectedPhone ? `(${this.connectedPhone})` : '');
                }
            });

            this.socket.ev.on('creds.update', saveCreds);
        } catch (err) {
            console.error('WhatsApp init zamanı xəta:', err);
            this.status = 'disconnected';
            this.isInitializing = false;

            if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                this.reconnectAttempts++;
                const delay = RECONNECT_DELAY_MS * this.reconnectAttempts;
                if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
                this.reconnectTimer = setTimeout(() => {
                    this.init().catch((e) => console.error('WhatsApp reconnect xətası:', e));
                }, delay);
            }
            return;
        }

        this.isInitializing = false;
    }

    getStatus() {
        return {
            status: this.status,
            qr: this.currentQr,
            connectedPhone: this.connectedPhone,
        };
    }

    private formatPhone(phone: string) {
        let formattedPhone = phone.replace(/[^0-9]/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '994' + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith('994') && formattedPhone.length === 9) {
            formattedPhone = '994' + formattedPhone;
        }
        return formattedPhone;
    }

    async sendMessage(phone: string, text: string) {
        if (this.status !== 'connected' || !this.socket) {
            throw new Error('WhatsApp bağlı deyil!');
        }

        const formattedPhone = this.formatPhone(phone);
        const jid = `${formattedPhone}@s.whatsapp.net`;

        await this.socket.sendMessage(jid, { text });
        return true;
    }

    async sendMessageToMany(phones: string[], text: string) {
        const uniquePhones = Array.from(
            new Set(
                phones
                    .map((phone) => phone.trim())
                    .filter(Boolean)
                    .map((phone) => this.formatPhone(phone))
            )
        );

        if (uniquePhones.length === 0) {
            throw new Error('Ən azı bir qəbul edən nömrə tələb olunur.');
        }

        const sent: string[] = [];
        const failed: { phone: string; error: string }[] = [];

        for (const phone of uniquePhones) {
            try {
                await this.sendMessage(phone, text);
                sent.push(phone);
            } catch (error) {
                failed.push({
                    phone,
                    error: error instanceof Error ? error.message : 'Göndərilmədi',
                });
            }
        }

        if (sent.length === 0) {
            throw new Error(failed[0]?.error || 'WhatsApp mesajı göndərilmədi.');
        }

        return { sent, failed };
    }

    async logout() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.reconnectAttempts = 0;
        this.isInitializing = false;

        try {
            if (this.socket) {
                await this.socket.logout();
            }
        } catch (e) {
            // socket.logout may fail if already disconnected; ignore
        }

        this.destroySocket();
        this.status = 'disconnected';
        this.currentQr = null;
        this.connectedPhone = null;

        await fs.rm(AUTH_DIR, { recursive: true, force: true }).catch(() => {});

        this.init().catch((err) => console.error('WhatsApp logout sonrası init xətası:', err));
    }
}

// Singleton instance
export const waService = new WhatsAppService();
