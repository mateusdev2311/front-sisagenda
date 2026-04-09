import axios from '../api/axiosConfig';

/**
 * Salva (ou atualiza) o token da OpenAI da clínica.
 * @param {string} token - Chave da OpenAI (sk-proj-...)
 */
export const saveAiToken = (token) =>
    axios.patch('/ai/token', { openai_token: token });

/**
 * Busca os dados da clínica, incluindo se a IA está configurada.
 * @returns {Promise} com { ..., ai_configured: boolean }
 */
export const getCompanyInfo = () =>
    axios.get('/company/me');

/**
 * Envia um arquivo de áudio para transcrição e geração de prontuário pela IA.
 * @param {File} audioFile - Arquivo de áudio (.webm, .mp3, .wav)
 * @param {string} patientName - Nome do paciente (opcional)
 * @returns {Promise} com { transcription, medical_record: { description, prescription } }
 */
export const transcribeAudio = (audioFile, patientName = '') => {
    const formData = new FormData();
    formData.append('audio', audioFile, 'consulta.webm');
    if (patientName) {
        formData.append('patient_name', patientName);
    }
    return axios.post('/ai/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 minutos (transcrição pode ser lenta)
    });
};

/**
 * Solicita uma análise inteligente da situação financeira (IA)
 * @param {Object} summaryData - Resumo financeiro (total, pendentes, métodos, etc)
 * @returns {Promise} com { insights: string } ou { data: string }
 */
export const getFinancialInsights = (summaryData) =>
    axios.post('/ai/financial-insights', summaryData);
