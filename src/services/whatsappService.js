/**
 * whatsappService.js
 * Serviço para integração com WhatsApp via Evolution API (backend próprio).
 */
import axios from '../api/axiosConfig';

/**
 * Normaliza o número de telefone garantindo o DDI 55 (Brasil).
 * Remove caracteres não numéricos e prefixa "55" se necessário.
 * Ex: "11999999999" → "5511999999999"
 *     "5511999999999" → "5511999999999"
 * @param {string} number
 * @returns {string}
 */
const normalizePhone = (number) => {
    const digits = String(number).replace(/\D/g, '');
    return digits.startsWith('55') ? digits : `55${digits}`;
};


/** Busca dados da instância da clínica no banco. */
export const getWhatsappInstance = () =>
    axios.get('/whatsapp/instance');

/** Cria a instância na Evolution API e persiste no banco. */
export const createWhatsappInstance = () =>
    axios.post('/whatsapp/instance');

/** Retorna o QR code em base64 para conectar o WhatsApp. */
export const connectWhatsappInstance = () =>
    axios.get('/whatsapp/instance/connect');

/** Verifica o status de conexão da instância (open | connecting | close). */
export const getWhatsappStatus = () =>
    axios.get('/whatsapp/instance/status');

/**
 * Ativa ou desativa lembretes automáticos.
 * @param {boolean} lembrete_ativo
 */
export const toggleWhatsappLembrete = (lembrete_ativo) =>
    axios.patch('/whatsapp/instance/lembrete', { lembrete_ativo });

/**
 * Envia uma mensagem de texto via WhatsApp.
 * O número é normalizado automaticamente — DDI 55 é adicionado se ausente.
 * @param {string} number  Ex: "11999999999" ou "5511999999999"
 * @param {string} text    Texto da mensagem
 */
export const sendWhatsappMessage = (number, text) =>
    axios.post('/whatsapp/send-message', { number: normalizePhone(number), text });

/** Remove a instância da Evolution API e do banco. */
export const deleteWhatsappInstance = () =>
    axios.delete('/whatsapp/instance');

/** Atualiza o template da mensagem de WhatsApp */
export const updateWhatsappTemplate = (message_template) =>
    axios.patch('/whatsapp/instance/template', { message_template });
