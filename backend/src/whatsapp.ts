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

export class WhatsAppService {
    private socket: any = null;
    private status: 'connecting' | 'connected' | 'disconnected' | 'qr_ready' = 'disconnected';
    private currentQr: string | null = null;
    private connectedPhone: string | null = null;

    constructor() {
        this.init();
    }

    async init() {
        const { state, saveCreds } = await createMultiFileAuthState(AUTH_DIR);

        this.connectedPhone = extractPhoneFromWhatsAppId(state.creds?.me?.id);
        this.status = 'connecting';

        this.socket = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['Logistika Panel', 'Chrome', '1.0.0'],
            logger: pino({ level: 'silent' }) // Logları gizle
        });

        this.socket.ev.on('connection.update', (update: any) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('WhatsApp QR Code ready');
                this.currentQr = qr;
                this.status = 'qr_ready';
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;

                this.status = 'disconnected';
                this.currentQr = null;
                this.connectedPhone = null;

                if (shouldReconnect) {
                    this.init();
                }
            } else if (connection === 'open') {
                this.status = 'connected';
                this.currentQr = null;
                this.connectedPhone = extractPhoneFromWhatsAppId(this.socket?.user?.id);
                console.log('WhatsApp bağlantısı uğurla quruldu!', this.connectedPhone ? `(${this.connectedPhone})` : '');
            }
        });

        this.socket.ev.on('creds.update', saveCreds);
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
        try {
            if (this.socket) {
                await this.socket.logout();
            }
        } catch (e) {
            // socket.logout may fail if already disconnected; ignore
        }
        this.status = 'disconnected';
        this.currentQr = null;
        this.connectedPhone = null;

        // Delete stored session so init() always produces a fresh QR
        await fs.rm(AUTH_DIR, { recursive: true, force: true }).catch(() => {});

        this.init();
    }
}

// Singleton instance
export const waService = new WhatsAppService();
