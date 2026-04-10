/**
 * billingRulesService.js
 * Serviço para gerenciar a régua de cobrança automática por WhatsApp.
 * Suporta Evolution API e Kentro (detecção automática no backend).
 */
import axios from '../api/axiosConfig';

// ─── Regras da Régua de Cobrança ─────────────────────────────────────────────

/** Retorna todas as regras de cobrança da clínica autenticada. */
export const getBillingRules = () =>
    axios.get('/billing-rules');

/** Cria uma nova regra de cobrança. */
export const createBillingRule = (data) =>
    axios.post('/billing-rules', data);

/**
 * Atualiza uma regra existente (template, ativo/inativo).
 * @param {number} id
 * @param {{ message_template?: string, is_active?: boolean }} data
 */
export const updateBillingRule = (id, data) =>
    axios.put(`/billing-rules/${id}`, data);

/**
 * Remove permanentemente uma regra de cobrança.
 * @param {number} id
 */
export const deleteBillingRule = (id) =>
    axios.delete(`/billing-rules/${id}`);

// ─── Histórico de Notificações ───────────────────────────────────────────────

/**
 * Retorna o histórico de disparos de uma fatura específica.
 * @param {number} billingId
 */
export const getNotificationHistory = (billingId) =>
    axios.get('/billing-notifications', { params: { billingId } });

/**
 * Dispara manualmente uma notificação de cobrança para uma fatura.
 * Ignora idempotência — força o envio imediato.
 * @param {number} billingId
 */
export const triggerManualDispatch = (billingId) =>
    axios.post(`/billing-notifications/trigger/${billingId}`);
