(function(){
  // ===== API pública =====
  window.initCalculadoraProjecao = function(selector, options = {}) {
    const config = {
      initial:{ pdvs:null, clientes:null, valor:null, pdv:null, est:null, cen1:null, cen2:null, cen3:null, meses:null },
      exampleButton:false,
      exampleValues:{ pdvs:60, clientes:1500, valor:5.9, pdv:25, est:10, cen1:10, cen2:20, cen3:30, meses:60 },
      resultsTarget:null, // <- mover resultados p/ outro container
      compact:false,      // <- aplica classe visual
      hideTitle:false     // <- esconde o h2 do widget
    };
    Object.assign(config, options);

    const host = document.querySelector(selector);
    if(!host){ console.error('Calculadora: container não encontrado:', selector); return; }

    const widget = renderWidget(config);
    if(config.compact) widget.classList.add('is-compact');
    host.appendChild(widget);

    // Move resultados se definido
    if(config.resultsTarget){
      const destino = document.querySelector(config.resultsTarget);
      const blocoResultados = widget.querySelector('#resultados');
      if(destino && blocoResultados) destino.appendChild(blocoResultados);
    }

    // Esconde título se pedido
    if(config.hideTitle){
      const tit = widget.querySelector('.calculadora-titulo');
      if(tit) tit.style.display = 'none';
    }

    // Pré-preencher por query string, se existir
    checkUrlParams();
  };

  // ===== Render =====
  function renderWidget(config){
    const wrap = document.createElement('div');
    wrap.className = 'calculadora-widget';

    wrap.innerHTML = `
      <h2 class="calculadora-titulo">Calculadora de Projeção de Ganhos</h2>

      <form class="calculadora-form" id="form-calculadora">
        <div class="form-row">
          ${input('pdvs','Quantidade de PDVs','ex.: 60')}
          ${input('clientes','Quantidade de clientes/mês','ex.: 1500')}
          ${input('valor','Valor do produto (R$)','ex.: 5,90')}
          ${input('pdv','% PDV','ex.: 25')}
          ${input('est','% Estipulante','ex.: 10')}
          ${input('meses','Horizonte (meses)','ex.: 60')}
          ${input('cen1','Cenário Pessimista (%)','ex.: 10')}
          ${input('cen2','Cenário Realista (%)','ex.: 20')}
          ${input('cen3','Cenário Otimista (%)','ex.: 30')}
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

    initEvents(wrap, config);
    return wrap;
  }

  // helpers de markup
  function input(id,label,ph){
    return `
      <div class="form-group">
        <label for="${id}" class="form-label">${label}</label>
        <input type="text" id="${id}" class="form-input" placeholder="${ph}" autocomplete="off">
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

  // ===== Eventos / Lógica =====
  function initEvents(scope, config){
    const form = scope.querySelector('#form-calculadora');
    const btnCalcular = scope.querySelector('#btn-calcular');
    const btnLimpar = scope.querySelector('#btn-limpar');
    const btnExemplo = scope.querySelector('#btn-exemplo');
    const resultados = document.getElementById('resultados'); // pode ter sido movido

    const camposCfg = [
      { id:'pdvs',    tipo:'inteiro',    min:0 },
      { id:'clientes',tipo:'inteiro',    min:0 },
      { id:'valor',   tipo:'decimal',    min:0 },
      { id:'pdv',     tipo:'percentual', min:0, max:100 },
      { id:'est',     tipo:'percentual', min:0, max:100 },
      { id:'cen1',    tipo:'percentual', min:0, max:100 },
      { id:'cen2',    tipo:'percentual', min:0, max:100 },
      { id:'cen3',    tipo:'percentual', min:0, max:100 },
      { id:'meses',   tipo:'inteiro',    min:12, max:120 }
    ];

    // listeners
    camposCfg.forEach(c=>{
      const input = scope.querySelector('#'+c.id);
      const erro  = scope.querySelector('#erro-'+c.id);
      input.addEventListener('input', ()=>{ validarCampo(input,erro,c); verificarFormulario(scope, btnCalcular); });
      input.addEventListener('blur',  ()=>{ validarCampo(input,erro,c); verificarFormulario(scope, btnCalcular); });
    });

    btnCalcular.addEventListener('click', ()=>{ calcular(scope); resultados.classList.add('mostrar'); });
    btnLimpar.addEventListener('click', ()=>{ limpar(scope, btnCalcular); resultados.classList.remove('mostrar'); });

    if(btnExemplo){
      btnExemplo.addEventListener('click', ()=>{
        preencherExemplo(scope, config.exampleValues);
        verificarFormulario(scope, btnCalcular);
        calcular(scope);
        resultados.classList.add('mostrar');
      });
    }

    form.addEventListener('submit', e=>{
      e.preventDefault();
      if(!btnCalcular.disabled){ calcular(scope); resultados.classList.add('mostrar'); }
    });
  }

  function validarCampo(input, erro, c){
    const valor = input.value.trim();
    if(valor === ''){ erro.textContent=''; return false; }
    const num = parseBRNumber(valor);
    if(Number.isNaN(num)){ erro.textContent='Valor inválido'; return false; }
    if(c.min!==undefined && num < c.min){ erro.textContent='Mínimo: '+c.min; return false; }
    if(c.max!==undefined && num > c.max){ erro.textContent='Máximo: '+c.max; return false; }
    erro.textContent=''; return true;
  }

  function verificarFormulario(scope, btn){
    const ids = ['pdvs','clientes','valor','pdv','est','cen1','cen2','cen3','meses'];
    const ok = ids.every(id=>{
      const el = scope.querySelector('#'+id);
      const err = scope.querySelector('#erro-'+id);
      return el.value.trim() !== '' && err.textContent === '';
    });
    btn.disabled = !ok; return ok;
  }

  function limpar(scope, btn){
    ['pdvs','clientes','valor','pdv','est','cen1','cen2','cen3','meses'].forEach(id=>{
      scope.querySelector('#'+id).value = '';
      scope.querySelector('#erro-'+id).textContent = '';
    });
    btn.disabled = true;
  }

  function preencherExemplo(scope, v){
    scope.querySelector('#pdvs').value = v.pdvs;
    scope.querySelector('#clientes').value = v.clientes;
    scope.querySelector('#valor').value = v.valor;
    scope.querySelector('#pdv').value = v.pdv;
    scope.querySelector('#est').value = v.est;
    scope.querySelector('#cen1').value = v.cen1;
    scope.querySelector('#cen2').value = v.cen2;
    scope.querySelector('#cen3').value = v.cen3;
    scope.querySelector('#meses').value = v.meses;
  }

  function parseBRNumber(str){
    str = String(str).replace(/[^0-9.,-]/g,'').replace(',','.');
    return parseFloat(str);
  }
  function fmtBRL(num){
    return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(num);
  }

  function calcular(scope){
    const pdvs     = parseBRNumber(scope.querySelector('#pdvs').value);
    const clientes = parseBRNumber(scope.querySelector('#clientes').value);
    const valor    = parseBRNumber(scope.querySelector('#valor').value);
    const pdvPerc  = parseBRNumber(scope.querySelector('#pdv').value)/100;
    const estPerc  = parseBRNumber(scope.querySelector('#est').value)/100;
    const cenPess  = parseBRNumber(scope.querySelector('#cen1').value)/100;
    const cenReal  = parseBRNumber(scope.querySelector('#cen2').value)/100;
    const cenOtim  = parseBRNumber(scope.querySelector('#cen3').value)/100;
    const horizonte= parseBRNumber(scope.querySelector('#meses').value);

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

  // Pré-preenchimento por URL (opcional)
  function checkUrlParams(){
    const params = new URLSearchParams(location.search);
    const map = ['pdvs','clientes','valor','pdv','est','cen1','cen2','cen3','meses'];
    let ok=false;
    map.forEach(k=>{
      if(params.has(k)){
        const inp = document.getElementById(k); if(inp){ inp.value = params.get(k); ok=true; }
      }
    });
    if(params.get('exemplo')==='1'){
      const btn = document.getElementById('btn-exemplo');
      if(btn) btn.classList.remove('hidden');
    }
    if(ok){
      const btn = document.getElementById('btn-calcular');
      // valida rapidamente
      const scope = btn.closest('.calculadora-widget');
      const campos = ['pdvs','clientes','valor','pdv','est','cen1','cen2','cen3','meses'];
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
