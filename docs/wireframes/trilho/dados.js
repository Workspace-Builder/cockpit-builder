/* ---------------------------------------------------------------------------
   O TRILHO — dado + painel + navegação
   ---------------------------------------------------------------------------
   Compartilhado pelas 3 perspectivas. A página só implementa a PISTA e chama
   TRILHO.iniciar({mover:fn, descida:fn}).

   DE ONDE VEM O DADO
   · FASES  ......... src/lib/flywheel.ts  (PHASES: nome, cor, papel)
   · POSTOS ......... src/lib/passos.ts    (os 11 passos com cicloPos != null)
   · arsenal ........ src/lib/flywheel.ts  (bricks da fase) + campos aula/ia/ferram
   · check .......... NÃO EXISTE NO REPO. É a subtask #9 (checklists por etapa).
                      Está aqui como PROPOSTA, derivada do campo `sub` de cada
                      passo. O painel marca isso na tela para ninguém confundir
                      wireframe com conteúdo aprovado.

   Um campo que o repo também não tem: `fase`. Hoje passos.ts só sabe `cicloPos`;
   a divisão em 6 trechos está hardcoded aqui (campo `f`), igual o wireframe
   antigo fazia. Virar código exige esse campo no dado.
   --------------------------------------------------------------------------- */
(function (glob) {
"use strict";

var FASES = [
  { k:'atracao',        n:'Atração',        c:'var(--c-atracao)',
    papel:'Leads chegam sem prospecção ativa — posicionamento, portfólio e conteúdo fazem o trabalho.' },
  { k:'venda',          n:'Venda',          c:'var(--c-venda)',
    papel:'Qualquer pessoa vende como o Lorenzi. A IA investiga o lead e conduz até o sim.' },
  { k:'gestao',         n:'Gestão',         c:'var(--c-gestao)',
    papel:'A entrada do projeto, processualizada. Briefing, contrato, pastas — nada se perde.' },
  { k:'execucao',       n:'Execução',       c:'var(--c-execucao)',
    papel:'O coração. O sistema constrói o que é mecânico e devolve o tempo pro que importa.' },
  { k:'qualidade',      n:'Qualidade',      c:'var(--c-qualidade)',
    papel:'O gate. A página só sai quando passa — é o que protege preço e reputação.' },
  { k:'posicionamento', n:'Posicionamento', c:'var(--c-posicionamento)',
    papel:'A entrega vira ativo. É aqui que a volta seguinte fica mais barata.' }
];

var POSTOS = [
  { km:1, f:1, t:'Atendimento', s:'Investiga antes de dar preço. Conversa conduzida até o sim.', gate:true,
    check:['Investigou o negócio antes de falar preço','Entendeu o objetivo real da página','Retorno ou call agendado'],
    ars:[['ia','IA 03 · Atendimento e Negociação'],['ia','IA 01 · Análise Estratégica'],
         ['ia','IA 04 · Webson Vendedor'],['aula','Easy Sales']] },

  { km:2, f:1, t:'Proposta profissional', s:'Amador no zap derruba o ticket na hora.', gate:true,
    check:['Proposta no template — não no zap','Escopo e prazo escritos','Preço com critério, não com medo'],
    ars:[['ferram','Template de Proposta'],['ferram','Template de Contrato'],['ferram','Planilha Financeira']] },

  { km:3, f:2, t:'Onboarding do cliente', s:'Todo projeto entra pelo mesmo trilho. Começo padrão mata refação.', gate:true,
    check:['Briefing preenchido pelo cliente','Acessos e materiais recebidos','Pasta do projeto criada','Card aberto na esteira'],
    ars:[['ferram','Formulário de Briefing'],['ferram','Esteira ClickUp · Setup Builder'],
         ['ferram','Pasta modelo (Google Drive)']] },

  { km:4, f:3, t:'Estratégia da página', s:'O que ela precisa ter pra converter — decidido antes de abrir ferramenta.', gate:true,
    check:['Objetivo da página definido','Seções mapeadas na ordem','Referência aprovada'],
    ars:[['ia','IA 05 · Estrutura de Sites'],['ferram','+180 páginas completas']] },

  { km:5, f:3, t:'Copy', s:'O texto que vende. Design bom não salva copy fraca.', gate:true,
    check:['Promessa clara na primeira dobra','Prova antes do pedido','CTA em toda seção'],
    ars:[['ia','IA 06 · Easy Copy'],['ia','IA 08 · Copy Builder Ads']] },

  { km:6, f:3, t:'Design', s:'Direção com intenção: arquétipo, paleta, tipografia. Nunca do zero.', gate:true,
    check:['Arquétipo definido','Paleta travada','Tipografia escolhida'],
    ars:[['aula','Design Easy'],['ia','IA 09 · Diretor Criativo'],
         ['ferram','Extensão EB · 1.000+ componentes'],['ferram','PageBox · 70+ Figma']] },

  { km:7, f:3, t:'Código e efeitos', s:'O acabamento que separa página de página cara.', gate:true,
    check:['Efeitos aplicados com critério','Console sem erro','Peso e velocidade conferidos'],
    ars:[['ia','IA 11 · Easy Coder'],['ferram','+120 códigos & elementos']] },

  { km:8, f:3, t:'Implementação técnica', s:'Subir sem quebrar o que já estava no ar.', gate:true,
    check:['Subiu no domínio do cliente','Backup feito antes','Formulários testados'],
    ars:[['ferram','Backup WordPress · 3 cliques'],['ferram','Hospedagem VPS']] },

  { km:9, f:4, t:'Qualidade antes de enviar', s:'O gate: a página só sai quando passa. Protege preço e reputação.', gate:true,
    check:['Passou no Analisador de Páginas','Responsivo em 3 telas','Links e formulários testados','SEO básico preenchido'],
    ars:[['ia','IA 12 · Analisador de Páginas'],['aula','Easy Optimize'],['ferram','Responsividade automática']] },

  { km:10, f:4, t:'Entregar no prazo', s:'Prazo cumprido é reputação composta.', gate:true,
    check:['Entregue na data combinada','Cliente avisado e treinado','Card fechado na esteira'],
    ars:[['ferram','Esteira ClickUp · Setup Builder'],['proc','Checklist de entrega']] },

  { km:11, f:5, t:'Prova social', s:'Pede hoje, publica essa semana. É o que abastece a próxima volta.', gate:false,
    check:['Depoimento pedido','Mockup gerado','Publicado no portfólio','Postado no Instagram'],
    ars:[['ia','IA 10 · Easy Image (mockups)'],['proc','Coleta de depoimento'],
         ['proc','Comunidade Behance']] }
];

var NAT = {
  ia:      { ic:'✦', n:'Inteligência' },
  ferram:  { ic:'▤', n:'Ferramenta' },
  aula:    { ic:'▶', n:'Aula' },
  proc:    { ic:'◇', n:'Processo' }
};

var N = POSTOS.length;

var estado = {
  atual: 0,
  volta: 1,
  modo: 'posto',
  feito: POSTOS.map(function (p) { return p.check.map(function () { return false; }); })
};

var pista = null;
function q(id){ return document.getElementById(id); }
function corDe(i){ return FASES[POSTOS[i].f].c; }
function cheio(i){ return estado.feito[i].every(Boolean); }
function totalCheios(){ var c=0; for(var i=0;i<N;i++) if(cheio(i)) c++; return c; }

/* ------------------------------------------------------------------ painel */
function pintar() {
  var el = q('painel');
  var i = estado.atual, p = POSTOS[i], f = FASES[p.f];

  if (estado.modo === 'descida') return pintarDescida();

  el.className = 'posto';
  el.style.setProperty('--pc', FASES[p.f].c);

  q('pKm').textContent = (p.km < 10 ? '0' : '') + p.km;
  q('pNome').textContent = p.t;
  q('pTrecho').textContent = 'trecho · ' + f.n;
  q('pSub').textContent = p.s;

  var ped = q('pPed');
  ped.textContent = p.gate ? '⛔ pedágio · 8020' : '○ acostamento';
  ped.className = p.gate ? 'ped' : 'ped livre';

  var marcados = estado.feito[i].filter(Boolean).length;
  var pct = Math.round(marcados / p.check.length * 100);
  q('pNivel').style.height = pct + '%';
  q('pLitros').textContent = marcados + '/' + p.check.length;

  var box = q('pItens'); box.innerHTML = '';
  p.check.forEach(function (txt, j) {
    var d = document.createElement('div');
    d.className = 'item' + (estado.feito[i][j] ? ' on' : '');
    d.innerHTML = '<span class="cx"></span><span>' + txt + '</span>';
    d.onclick = function () { estado.feito[i][j] = !estado.feito[i][j]; pintar(); hud(); };
    box.appendChild(d);
  });

  var g = q('pGate');
  if (cheio(i)) { g.className = 'gate ok'; g.textContent = '✓ tanque cheio — pode seguir'; }
  else if (p.gate) { g.className = 'gate travado'; g.textContent = '⛔ pedágio fechado — abasteça pra passar'; }
  else { g.className = 'gate'; g.textContent = '○ acostamento — dá pra seguir sem abastecer'; }

  var ars = q('pArs'); ars.innerHTML = '';
  q('pArsN').textContent = p.ars.length + ' no posto';
  p.ars.forEach(function (a) {
    var d = document.createElement('div');
    d.className = 'tij';
    d.innerHTML = '<span class="ic">' + NAT[a[0]].ic + '</span>' +
                  '<span><b>' + a[1] + '</b><span class="nat">' + NAT[a[0]].n + '</span></span>';
    ars.appendChild(d);
  });

  q('pPos').textContent = 'km ' + p.km + ' de ' + N;
  q('bProx').className = (p.gate && !cheio(i)) ? 'travado' : '';

  if (pista && pista.marcar) pista.marcar(i);
  hud();
}

function pintarDescida() {
  var el = q('painel');
  el.className = 'posto descida';
  el.innerHTML =
    '<div class="pcab"><span class="pkm">↓</span><div><h2>Atração</h2>' +
    '<span class="ptrecho">trecho · descida</span></div>' +
    '<span class="ped livre">0 postos</span></div>' +
    '<div class="descida-corpo">' +
    '<span class="marca">O ÚNICO TRECHO SEM PARADA</span>' +
    '<div class="grande">Aqui você anda sem acelerar.</div>' +
    '<p>Nenhum dos 36 passos tem <code>cicloPos</code> na Atração — e isso não é ' +
    'buraco no dado, é a tese. A Atração é <b>efeito</b> das outras cinco: ela ' +
    'acontece porque a volta anterior aconteceu.</p>' +
    '<p>Numa lista isso apareceria como uma seção vazia. Numa estrada, aparece ' +
    'como o que de fato é: a descida que o momentum da volta passada pagou. ' +
    'É o anti-prospecção, desenhado.</p>' +
    '<p style="color:var(--texto-3)">O que <i>constrói</i> essa descida — posicionamento, ' +
    'portfólio, Instagram — são passos do prédio, não do ciclo. Você monta uma vez.</p>' +
    '</div>' +
    '<div class="pnav"><button onclick="TRILHO.ir(10)">← km 11</button>' +
    '<span>trecho 1 de 6</span>' +
    '<button onclick="TRILHO.ir(0)">km 01 →</button></div>';
  if (pista && pista.descida) pista.descida();
  hud();
}

/* --------------------------------------------------------------------- hud */
function hud() {
  q('hOdo').textContent = totalCheios() + '/' + N;
  q('hVolta').textContent = estado.volta;
  var b = q('hBag'); b.innerHTML = '';
  for (var i = 0; i < N; i++) {
    var e = document.createElement('i');
    if (cheio(i)) { e.className = 'on'; e.style.background = corDe(i); }
    b.appendChild(e);
  }
}

/* -------------------------------------------------------------- navegação */
function ir(i) {
  if (estado.modo === 'descida') { restaurarPainel(); }
  estado.modo = 'posto';
  estado.atual = ((i % N) + N) % N;
  if (pista && pista.mover) pista.mover(estado.atual);
  pintar();
}

function prox() {
  if (estado.atual === N - 1) { estado.volta++; }
  ir(estado.atual + 1);
}
function ant() { ir(estado.atual - 1); }

function trecho(k) {
  if (k === 0) { estado.modo = 'descida'; pintar(); return; }
  for (var i = 0; i < N; i++) if (POSTOS[i].f === k) return ir(i);
}

// O modo descida reescreve o painel inteiro. Voltar dele exige religar os
// botões: o innerHTML novo traz nós novos, e o onclick do boot ficou no antigo.
var moldePainel = null;
function restaurarPainel() {
  if (!moldePainel) return;
  q('painel').innerHTML = moldePainel;
  ligarBotoes();
}
function ligarBotoes() { q('bAnt').onclick = ant; q('bProx').onclick = prox; }

/* ------------------------------------------------------------------ boot */
function iniciar(p) {
  pista = p;
  moldePainel = q('painel').innerHTML;
  if (p.desenhar) p.desenhar();

  ligarBotoes();

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); return prox(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); return ant(); }
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= 6) return trecho(n - 1);
  });

  ir(0);
}

glob.TRILHO = {
  FASES: FASES, POSTOS: POSTOS, NAT: NAT, N: N, estado: estado,
  iniciar: iniciar, ir: ir, prox: prox, ant: ant, trecho: trecho,
  cor: corDe, cheio: cheio, pintar: pintar
};

})(window);
