import { createContext, useContext, useState, useEffect } from 'react';
import axios from '../api/axiosConfig';

const SettingsContext = createContext({});

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        id: null,
        company_name: 'Sisagenda',
        company_cnpj: '',
        timezone: 'America/Sao_Paulo',
        currency: 'BRL',
    });
    const [loadingSettings, setLoadingSettings] = useState(true);

    useEffect(() => {
        axios.get('/system-settings')
            .then(res => {
                // Aceita array (pega o primeiro) ou objeto direto
                const data = Array.isArray(res.data) ? res.data[0] : res.data;
                if (data) setSettings(data);
            })
            .catch(err => console.warn('system-settings unavailable:', err))
            .finally(() => setLoadingSettings(false));
    }, []);

    const refreshSettings = () => {
        axios.get('/system-settings')
            .then(res => {
                const data = Array.isArray(res.data) ? res.data[0] : res.data;
                if (data) setSettings(data);
            })
            .catch(err => console.warn('system-settings refresh error:', err));
    };

    return (
        <SettingsContext.Provider value={{ settings, loadingSettings, refreshSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);

export default SettingsContext;
