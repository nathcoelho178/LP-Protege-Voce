(function(){
  window.initCalculadoraProjecao = function(selector, options = {}) {
    const config = {
      initial:{ pdvs:null, clientes:null, valor:null, pdv:null, est:null, cen1:null, cen2:null, cen3:null },
      exampleButton:false,
      exampleValues:{ pdvs:1, clientes:1500, valor:5.9, pdv:25, est:10, cen1:10, cen2:20, cen3:30 },
      resultsTarget:null, 
      compact:false,      
      hideTitle:false     
    };
    Object.assign(config, options);

    const host = document.querySelector(selector);
    if(!host){ console.error('Calculadora: container não encontrado:', selector); return; }

    const widget = renderWidget(config);
    if(config.compact) widget.classList.add('is-compact');
    host.appendChild(widget);

    if(config.resultsTarget){
      const destino = document.querySelector(config.resultsTarget);
      const blocoResultados = widget.querySelector('#resultados');
      if(destino && blocoResultados) destino.appendChild(blocoResultados);
    }

    if(config.hideTitle){
      const tit = widget.querySelector('.calculadora-titulo');
      if(tit) tit.style.display = 'none';
    }

    checkUrlParams();
  };

  function renderWidget(config){
    const wrap = document.createElement('div');
    wrap.className = 'calculadora-widget';

    wrap.innerHTML = `
      <h2 class="calculadora-titulo">Calculadora de Projeção de Ganhos</h2>

      <form class="calculadora-form" id="form-calculadora">
        <div class="form-row">
          ${input('pdvs','Quantidade de PDVs','ex.: 1')}
          ${input('clientes','Quantidade de clientes/mês','ex.: 1.500')}
          ${input('valor','Valor do produto (R$)','ex.: R$ 5,90')}
          ${input('pdv','% PDV','ex.: 25')}
          ${input('est','% Estipulante','ex.: 10')}
          ${input('cen1','Cenário Pessimista (%)','ex.: 10','Conversão de 10% dos clientes/mês')}
          ${input('cen2','Cenário Realista (%)','ex.: 20','Conversão de 20% dos clientes/mês')}
          ${input('cen3','Cenário Otimista (%)','ex.: 30','Conversão de 30% dos clientes/mês')}
        </div>

        <div class="calculadora-botoes">
          <button type="button" id="btn-calcular" class="btn btn-primario" disabled>Calcular</button>
          <button type="button" id="btn-limpar" class="btn btn-secundario">Limpar</button>
          <button type="button" id="btn-exemplo" class="btn btn-exemplo ${!config.exampleButton ? 'hidden' : ''}">Usar Exemplo</button>
        </div>
      </form>

      <div class="resultados" id="resultados">
        <h3 class="resultados-titulo">Cenários para PDV</h3>
        <div class="tabela-scroll">
          <table class="tabela-resultados" id="tabela-pdv">
            ${thead()}
            <tbody>
              ${row('pdv-pess','Pessimista')}
              ${row('pdv-real','Realista')}
              ${row('pdv-otim','Otimista')}
            </tbody>
          </table>
        </div>

        <h3 class="resultados-titulo">Cenários para Estipulante</h3>
        <div class="tabela-scroll">
          <table class="tabela-resultados" id="tabela-estip">
            ${thead()}
            <tbody>
              ${row('estip-pess','Pessimista')}
              ${row('estip-real','Realista')}
              ${row('estip-otim','Otimista')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    wrap.querySelector('#cen1').value = '10';
    wrap.querySelector('#cen2').value = '20';
    wrap.querySelector('#cen3').value = '30';

    updateScenarioHint(wrap,'cen1');
    updateScenarioHint(wrap,'cen2');
    updateScenarioHint(wrap,'cen3');

    wrap.querySelector('#clientes')?.setAttribute('inputmode','numeric');
    wrap.querySelector('#valor')?.setAttribute('inputmode','decimal');

    initEvents(wrap, config);
    return wrap;
  }

  function input(id,label,ph, hint=''){
  return `
    <div class="form-group">
      <label for="${id}" class="form-label">${label}</label>
      <input type="text" id="${id}" class="form-input" placeholder="${ph}" autocomplete="off">
      ${hint ? `<small class="form-hint" id="hint-${id}">${hint}</small>` : ``}
      <span class="form-error" id="erro-${id}"></span>
    </div>
  `;
}
  function thead(){
    return `
      <thead>
        <tr>
          <th>Cenário</th>
          <th>Mês 1</th>
          <th>Mês 2</th>
          <th>Mês 12</th>
          <th>Mês 24</th>
          <th>Mês 48</th>
          <th>Mês 60</th>
          <th>Acumulado</th>
        </tr>
      </thead>
    `;
  }
  function row(prefix,label){
    return `
      <tr>
        <td>${label}</td>
        <td id="${prefix}-m1">-</td>
        <td id="${prefix}-m2">-</td>
        <td id="${prefix}-m12">-</td>
        <td id="${prefix}-m24">-</td>
        <td id="${prefix}-m48">-</td>
        <td id="${prefix}-m60">-</td>
        <td id="${prefix}-acum">-</td>
      </tr>
    `;
  }

  function updateScenarioHint(scope, id){
  const v = parseBRNumber(scope.querySelector('#'+id)?.value ?? '');
  const hintEl = scope.querySelector('#hint-'+id);
  if(!hintEl) return;
  if (Number.isFinite(v)) {
    hintEl.textContent = `Conversão de ${v}% dos clientes/mês`;
  } else {
    hintEl.textContent = `Informe a conversão em % dos clientes/mês`;
  }
}

  function initEvents(scope, config){
    const form = scope.querySelector('#form-calculadora');
    const btnCalcular = scope.querySelector('#btn-calcular');
    const btnLimpar = scope.querySelector('#btn-limpar');
    const btnExemplo = scope.querySelector('#btn-exemplo');
    const resultados = document.getElementById('resultados'); // pode ter sido movido

    const camposCfg = [
      { id:'pdvs',    tipo:'inteiro',    min:0 },
      { id:'clientes',tipo:'inteiro',    min:0, formatThousands:true },
      { id:'valor',   tipo:'decimal',    min:0, formatCurrency:true },
      { id:'pdv',     tipo:'percentual', min:0, max:100 },
      { id:'est',     tipo:'percentual', min:0, max:100 },
      { id:'cen1',    tipo:'percentual', min:0, max:100 },
      { id:'cen2',    tipo:'percentual', min:0, max:100 },
      { id:'cen3',    tipo:'percentual', min:0, max:100 }
      // horizonte fixo = 60 (não há campo)
    ];

    camposCfg.forEach(c=>{
      const input = scope.querySelector('#'+c.id);
      const erro  = scope.querySelector('#erro-'+c.id);

      const onChange = ()=>{
        if (c.formatThousands) formatThousandsInput(input);
        if (c.formatCurrency)  formatCurrencyBRInput(input);
        validarCampo(input,erro,c);
        verificarFormulario(scope, btnCalcular, camposCfg);
        if (['cen1','cen2','cen3'].includes(c.id)) updateScenarioHint(scope, c.id);
      };

      input.addEventListener('input', onChange);
      input.addEventListener('blur', onChange);
    });

    btnCalcular.addEventListener('click', ()=>{ calcular(scope); resultados.classList.add('mostrar'); });
    btnLimpar.addEventListener('click', ()=>{ limpar(scope, btnCalcular, camposCfg); resultados.classList.remove('mostrar'); });

    if(btnExemplo){
      btnExemplo.addEventListener('click', ()=>{
        preencherExemplo(scope, config.exampleValues);
        verificarFormulario(scope, btnCalcular, camposCfg);
        calcular(scope);
        resultados.classList.add('mostrar');
      });
    }

    form.addEventListener('submit', e=>{
      e.preventDefault();
      if(!btnCalcular.disabled){ calcular(scope); resultados.classList.add('mostrar'); }
    });
  }

  function getNumericValue(input, cfg){
    if (cfg && cfg.formatThousands) {
      const digits = input.value.replace(/\D/g,'');
      return digits ? parseInt(digits,10) : NaN;
    }
    if (cfg && cfg.formatCurrency) {
      // moeda pt-BR mascarada
      return parseBRNumber(input.value);
    }
    return parseBRNumber(input.value);
  }

  function validarCampo(input, erro, c){
    const raw = input.value.trim();
    if(raw === ''){ erro.textContent=''; return false; }
    const num = getNumericValue(input, c);
    if(Number.isNaN(num)){ erro.textContent='Valor inválido'; return false; }
    if(c.min!==undefined && num < c.min){ erro.textContent='Mínimo: '+c.min; return false; }
    if(c.max!==undefined && num > c.max){ erro.textContent='Máximo: '+c.max; return false; }
    erro.textContent=''; return true;
  }

  function verificarFormulario(scope, btn, camposCfg){
    const ok = camposCfg.every(c=>{
      const el = scope.querySelector('#'+c.id);
      const err = scope.querySelector('#erro-'+c.id);
      return el.value.trim() !== '' && (err.textContent === '');
    });
    btn.disabled = !ok; return ok;
  }

  function limpar(scope, btn, camposCfg){
    camposCfg.forEach(c=>{
      const el = scope.querySelector('#'+c.id);
      el.value = '';
      scope.querySelector('#erro-'+c.id).textContent = '';
    });
    // recoloca defaults dos cenários
    scope.querySelector('#cen1').value = '10';
    scope.querySelector('#cen2').value = '20';
    scope.querySelector('#cen3').value = '30';
    btn.disabled = true;
  }

  function preencherExemplo(scope, v){
    scope.querySelector('#pdvs').value = v.pdvs ?? '';
    const elCli = scope.querySelector('#clientes');
    elCli.value = v.clientes ?? '';
    formatThousandsInput(elCli); // exibe 1.500 etc.

    const elVal = scope.querySelector('#valor');
    elVal.value = fmtBRL(parseBRNumber(v.valor ?? ''));
    // demais
    scope.querySelector('#pdv').value = v.pdv ?? '';
    scope.querySelector('#est').value = v.est ?? '';
    scope.querySelector('#cen1').value = v.cen1 ?? '10';
    scope.querySelector('#cen2').value = v.cen2 ?? '20';
    scope.querySelector('#cen3').value = v.cen3 ?? '30';
    ['cen1','cen2','cen3'].forEach(id => updateScenarioHint(scope, id));
  }

  function formatThousandsInput(el){
    const digits = el.value.replace(/\D/g,'');
    el.value = digits ? new Intl.NumberFormat('pt-BR').format(parseInt(digits,10)) : '';
  }

  function formatCurrencyBRInput(el){
    const digits = el.value.replace(/\D/g,''); // centavos
    if(!digits){ el.value = ''; return; }
    const v = (parseInt(digits,10) / 100) || 0;
    el.value = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
  }

  function parseBRNumber(str){
    let s = String(str).trim();
    if (s === '') return NaN;
    s = s.replace(/[^0-9.,-]/g,'');
    if (s.includes(',')) s = s.replace(/\./g,'').replace(',', '.');
    return parseFloat(s);
  }

  function fmtBRL(num){
    return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(num);
  }

  function calcular(scope){
    const pdvs     = getNumericValue(scope.querySelector('#pdvs'),    {id:'pdvs'});
    const clientes = getNumericValue(scope.querySelector('#clientes'), {formatThousands:true});
    const valor    = getNumericValue(scope.querySelector('#valor'),    {formatCurrency:true});
    const pdvPerc  = getNumericValue(scope.querySelector('#pdv'),      {id:'pdv'})/100;
    const estPerc  = getNumericValue(scope.querySelector('#est'),      {id:'est'})/100;
    const cenPess  = getNumericValue(scope.querySelector('#cen1'),     {id:'cen1'})/100;
    const cenReal  = getNumericValue(scope.querySelector('#cen2'),     {id:'cen2'})/100;
    const cenOtim  = getNumericValue(scope.querySelector('#cen3'),     {id:'cen3'})/100;
    const horizonte= 60; // FIXO

    const baseMensal = pdvs * clientes * valor;

    const mensalPDV = { pess: baseMensal*cenPess*pdvPerc, real: baseMensal*cenReal*pdvPerc, otim: baseMensal*cenOtim*pdvPerc };
    const mensalEst = { pess: baseMensal*cenPess*estPerc, real: baseMensal*cenReal*estPerc, otim: baseMensal*cenOtim*estPerc };

    atualizarTabela('pdv-pess', mensalPDV.pess, horizonte);
    atualizarTabela('pdv-real', mensalPDV.real, horizonte);
    atualizarTabela('pdv-otim', mensalPDV.otim, horizonte);

    atualizarTabela('estip-pess', mensalEst.pess, horizonte);
    atualizarTabela('estip-real', mensalEst.real, horizonte);
    atualizarTabela('estip-otim', mensalEst.otim, horizonte);
  }

  function atualizarTabela(prefixo, mensal, N){
    const pontos = [1,2,12,24,48,60];
    pontos.forEach(m=>{
      const el = document.getElementById(`${prefixo}-m${m}`);
      if(!el) return;
      el.textContent = (m <= N) ? fmtBRL(mensal * m) : '-';
    });
    const acum = mensal * (N * (N+1) / 2);
    const out = document.getElementById(`${prefixo}-acum`);
    if(out) out.textContent = fmtBRL(acum);
  }

  function checkUrlParams(){
    const params = new URLSearchParams(location.search);
    const keys = ['pdvs','clientes','valor','pdv','est','cen1','cen2','cen3']; // sem 'meses'
    let ok=false;

    keys.forEach(k=>{
      if(!params.has(k)) return;
      const inp = document.getElementById(k);
      if(!inp) return;

      const val = params.get(k);
      if (k === 'clientes') { inp.value = val; formatThousandsInput(inp); }
      else if (k === 'valor') { inp.value = fmtBRL(parseBRNumber(val)); }
      else { inp.value = val; }
      ok = true;
    });

    if(params.get('exemplo')==='1'){
      const btn = document.getElementById('btn-exemplo');
      if(btn) btn.classList.remove('hidden');
    }

    ['cen1','cen2','cen3'].forEach(id => {
    const el = document.getElementById(id);
    const hint = document.getElementById('hint-'+id);
    if (el && hint) {
    const val = parseBRNumber(el.value);
    hint.textContent = Number.isFinite(val)
      ? `Conversão de ${val}% dos clientes/mês`
      : `Informe a conversão em % dos clientes/mês`;
  }
    });

    if(ok){
      const btn = document.getElementById('btn-calcular');
      const scope = btn.closest('.calculadora-widget');
      const campos = ['pdvs','clientes','valor','pdv','est','cen1','cen2','cen3'];
      const valid = campos.every(id=>{
        const el = scope.querySelector('#'+id);
        const err= scope.querySelector('#erro-'+id);
        return el && el.value.trim()!=='' && !err?.textContent;
      });
      if(valid){
        btn.disabled=false;
        btn.click();
      }
    }
  }
})();