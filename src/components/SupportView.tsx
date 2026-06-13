/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  HelpCircle, 
  Send, 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';

export default function SupportView() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: 'issue', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Como funciona a divisão inteligente por tópicos?',
      a: 'O FoziScribe analisa a harmonia semântica e picos de pausa maiores que 2 segundos. Ao detectar que houve um silêncio considerável ou uma mudança de foco na discussão, a IA cria um novo módulo temático com cabeçalho explicatívo e novos carimbos de tempo ([0:00]).'
    },
    {
      q: 'Os formatos das legendas automáticas são editáveis?',
      a: 'Sim, totalmente! Na aba History (Histórico), você pode clicar no ícone de lápis em qualquer linha de texto para atualizar o conteúdo verbal. Ao fazer o download em SRT (SubRip) ou VTT, o arquivo exportado virá formatado perfeitamente com as atualizações que você inseriu.'
    },
    {
      q: 'A detecção de múltiplos palestrantes é automática?',
      a: 'Sim, na modalidade de processamento Accuracy Mode, o modelo Gemini de inteligência artificial deduz marcas vocais e nomes introduzidos no diálogo para auto-rotular os palestrantes ("Palestrante 1", "Bruno Lima", etc.).'
    },
    {
      q: 'Como funciona a sincronização e privacidade na nuvem?',
      a: 'Seus dados e gravações de mídias são compactados e armazenados com segurança integrada restrita à sua conta. Links compartilhados públicos apenas funcionam caso você decida explicitamente ativá-los clicando em "Partilhar".'
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', subject: 'issue', message: '' });
    }, 5000);
  };

  return (
    <div id="support-view" className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white font-sans tracking-tight">Ajuda & Suporte</h2>
        <p className="text-gray-400 text-sm mt-1">
          Encontre respostas para dúvidas frequentes ou envie uma mensagem direta para a nossa equipe técnica de IA.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        
        {/* Left column: FAQ section */}
        <div className="md:col-span-3 space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 select-none flex items-center gap-1.5 align-left text-left">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>Perguntas Frequentes</span>
          </h3>

          <div id="faq-list" className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div 
                  key={idx}
                  className="bg-gray-900/40 border border-white/5 rounded-xl transition-all duration-200 overflow-hidden backdrop-blur-md"
                >
                  <button
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full p-4 text-left font-semibold text-gray-200 hover:text-white text-xs sm:text-sm flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-450 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-450 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-gray-400 leading-relaxed border-t border-white/5 pt-2.5 text-left">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Form support message */}
        <div className="md:col-span-2">
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 shadow-sm space-y-4 backdrop-blur-md">
            <h3 className="text-xs font-bold text-gray-450 uppercase tracking-wide select-none flex items-center gap-1.5 border-b border-white/5 pb-2 ml-0 align-left text-left">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>Fale Conosco</span>
            </h3>

            {submitted ? (
              <div className="p-6 text-center space-y-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 mx-auto">
                  <Send className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-400 text-sm">Mensagem Enviada!</h4>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">Retornaremos com soluções específicas de correção em até 24 horas úteis no seu e-mail.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 text-left">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-wide">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Carlos Silva"
                    className="w-full bg-black/45 border border-white/10 text-white text-xs rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-wide">E-mail para Retorno</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="seuemail@exemplo.com"
                    className="w-full bg-black/45 border border-white/10 text-white text-xs rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-wide">Assunto</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-black/45 border border-white/10 text-white text-xs rounded-xl px-3 py-2 outline-none leading-none cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="issue" className="bg-[#0e0d16] text-[#b3b3b3]">Falha na Transcrição</option>
                    <option value="subtitles" className="bg-[#0e0d16] text-[#b3b3b3]">Problema nas Legendas (SRT)</option>
                    <option value="billing" className="bg-[#0e0d16] text-[#b3b3b3]">Dúvida sobre Faturamento</option>
                    <option value="suggestion" className="bg-[#0e0d16] text-[#b3b3b3]">Sugerir uma Melhoria</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-wide">Mensagem</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Descreva detalhadamente o problema ou sugestão..."
                    className="w-full bg-black/45 border border-white/10 text-white text-xs rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 border border-indigo-500/30 hover:bg-indigo-500 rounded-xl text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Solicitação</span>
                </button>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
