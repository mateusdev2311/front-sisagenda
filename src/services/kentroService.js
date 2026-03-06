/**
 * kentroService.js
 * Serviço para disparo de mensagens WhatsApp via API Kentro.
 * 
 * Uso:
 *   import { sendKentroMessage } from '../services/kentroService';
 *   await sendKentroMessage({ baseUrl, apiKey, queueId, number, text });
 */
import axios from 'axios'; // Axios puro (sem a instância com baseURL interna)

/**
 * Dispara uma mensagem WhatsApp via fila Kentro.
 * @param {object} params
 * @param {string} params.baseUrl   - Ex: "minha-empresa.app.kentro.com.br"
 * @param {string} params.apiKey    - API Key da fila
 * @param {number} params.queueId   - ID da fila
 * @param {string} params.number    - Número do destinatário (somente dígitos, ex: "5511999999999")
 * @param {string} params.text      - Texto da mensagem
 * @returns {Promise}
 */
export const sendKentroMessage = ({ baseUrl, apiKey, queueId, number, text }) => {
    return axios.post(`https://${baseUrl}/int/enqueueMessageToSend`, {
        queueId: Number(queueId),
        apiKey,
        number,
        text,
    });
};
