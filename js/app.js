const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

async function copy(value){
  try { await navigator.clipboard.writeText(value); }
  catch { const ta=document.createElement("textarea"); ta.value=value; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
}

$$('[data-copy]').forEach(btn=>{
  btn.addEventListener('click', async ()=>{
    const el=document.getElementById(btn.dataset.copy);
    await copy(el.innerText);
    const old=btn.textContent; btn.textContent='Copiado'; setTimeout(()=>btn.textContent=old,900);
  });
});
$$('[data-copy-text]').forEach(btn=>{
  btn.addEventListener('click', async ()=>{
    await copy(btn.dataset.copyText);
    const old=btn.textContent; btn.textContent='Copiado'; setTimeout(()=>btn.textContent=old,900);
  });
});

$$('.tabs').forEach(tabs=>{
  const section=tabs.closest('.endpoint-main');
  $$('.tab',tabs).forEach(tab=>{
    tab.addEventListener('click',()=>{
      $$('.tab',tabs).forEach(x=>x.classList.remove('active'));
      tab.classList.add('active');
      $$('.tab-panel',section).forEach(p=>p.classList.remove('active'));
      $(`.tab-panel[data-panel="${tab.dataset.tab}"]`,section).classList.add('active');
    });
  });
});

const sidebar=document.getElementById('sidebar');
document.getElementById('mobileMenu').addEventListener('click',()=>sidebar.classList.toggle('open'));

/*
 * Navegação do menu:
 * durante um clique, o IntersectionObserver fica temporariamente bloqueado.
 * Isso evita o "pisca" causado pelo scroll suave atravessando outras sections.
 * Depois que a rolagem termina, o observer volta a controlar a seleção.
 */
const navLinks=$$('.nav-link');
let navigationLock=false;
let navigationTimer=null;
let navigationTarget=null;

function setActive(id){
  navLinks.forEach(a=>a.classList.toggle('active',a.dataset.section===id));
}

function finishNavigation(){
  navigationLock=false;
  if(navigationTarget){
    setActive(navigationTarget);
    navigationTarget=null;
  }
}

function startNavigation(id){
  navigationLock=true;
  navigationTarget=id;
  setActive(id);
  sidebar.classList.remove('open');
  clearTimeout(navigationTimer);
  navigationTimer=setTimeout(finishNavigation,850);
}

navLinks.forEach(a=>a.addEventListener('click',()=>startNavigation(a.dataset.section)));

const sections=$$('.page-section');
const observer=new IntersectionObserver(entries=>{
  if(navigationLock) return;

  const visible=entries
    .filter(e=>e.isIntersecting)
    .sort((a,b)=>{
      const aTop=Math.abs(a.boundingClientRect.top-100);
      const bTop=Math.abs(b.boundingClientRect.top-100);
      return aTop-bTop;
    });

  if(visible.length) setActive(visible[0].target.id);
},{rootMargin:'-12% 0px -72% 0px',threshold:[0,.05,.15,.3,.5]});
sections.forEach(s=>observer.observe(s));

/* Se o navegador expuser scrollend, usamos o evento para liberar o lock imediatamente. */
if('onscrollend' in window){
  window.addEventListener('scrollend',finishNavigation,{passive:true});
}

const search=document.getElementById('search');
search.addEventListener('input',()=>{
  const q=search.value.trim().toLowerCase();
  navLinks.forEach(a=>a.style.display=a.innerText.toLowerCase().includes(q)?'flex':'none');
});
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();search.focus();}
});

function pretty(obj){return JSON.stringify(obj,null,2)}
function statusLabel(code){
  const labels={200:'200 OK',201:'201 Created',400:'400 Bad Request',401:'401 Unauthorized',409:'409 Conflict',500:'500 Internal Server Error'};
  return labels[code] || String(code);
}
function statusClass(code){
  if(code===200) return 'ok';
  if(code===201) return 'created';
  if(code===409) return 'conflict';
  if(code===401) return 'auth';
  if(code===500) return 'server';
  return 'bad';
}
function setMockStatus(resultTitle, code){
  const status=$('.status',resultTitle);
  status.textContent=statusLabel(code);
  status.className='status '+statusClass(code);
}

function gcMock(){
  const mode=$('#gc-mode').value;
  const empresa=Number($('#gc-empresa').value)||1;
  const uf=$('#gc-uf').value||'RS';
  const pageSize=Number($('#gc-page').value)||10;
  const scenario=Number($('#gc-scenario').value);

  if(scenario===400) return {request_id:'MOCK-GET-CUSTOMERS',res_code:400,res_message:'Parâmetros inválidos.',data:{}};
  if(scenario===401) return {request_id:'MOCK-GET-CUSTOMERS',res_code:401,res_message:'Não autorizado.',data:{}};
  if(scenario===500) return {request_id:'MOCK-GET-CUSTOMERS',res_code:500,res_message:'Erro interno ao consultar os clientes.',data:{}};

  const customers=mode==='single'
    ? [{cod_cliente:1,nome:'Empresa XYZ Ltda',tipo_pessoa:'J',cidade:'Caxias do Sul',uf,cnpj_cpf:'05104409000234',ativo:'S',bloqueado:'N'}]
    : [{cod_cliente:1,nome:'Empresa XYZ Ltda',tipo_pessoa:'J',cidade:'Caxias do Sul',uf,ativo:'S',bloqueado:'N'},
       {cod_cliente:2,nome:'Comercial Exemplo Ltda',tipo_pessoa:'J',cidade:'Porto Alegre',uf,ativo:'S',bloqueado:'N'},
       {cod_cliente:3,nome:'João da Silva',tipo_pessoa:'F',cidade:'Bento Gonçalves',uf,ativo:'S',bloqueado:'N'}].slice(0,Math.min(pageSize,3));
  return {request_id:'MOCK-GET-CUSTOMERS',res_code:200,res_message:'Consulta executada com sucesso',data:{total:mode==='single'?1:500,count:customers.length,...(mode==='list'?{page:1,page_size:pageSize}:{}),customers}};
}
function renderGc(){
  const out=$('#gc-result'); const resultTitle=out.closest('.mock-result').querySelector('.result-title');
  out.textContent='Executando mock...';
  setTimeout(()=>{const result=gcMock(); setMockStatus(resultTitle,result.res_code); out.textContent=pretty(result);},180);
}
$('#gc-run').addEventListener('click',renderGc);
$('#gc-scenario').addEventListener('change',renderGc);
$('#gc-result').textContent=pretty(gcMock());

function parseMock(text){try{return JSON.parse(text)}catch{return null}}
function renderRc(){
  const out=$('#rc-result'); const resultTitle=out.closest('.mock-result').querySelector('.result-title');
  const body=parseMock($('#rc-body').value); const scenario=Number($('#rc-scenario').value);
  let result;
  if(scenario===400 || !body) result={request_id:'MOCK-REGISTER-CUSTOMER',res_code:400,res_message:body?'Dados inválidos.':'JSON inválido.',data:{}};
  else if(scenario===409) result={request_id:'MOCK-REGISTER-CUSTOMER',res_code:409,res_message:'Cliente já cadastrado no Fênix ERP',data:{}};
  else if(scenario===500) result={request_id:'MOCK-REGISTER-CUSTOMER',res_code:500,res_message:'Erro interno ao registrar o cliente.',data:{}};
  else result={request_id:'MOCK-REGISTER-CUSTOMER',res_code:201,res_message:'Cliente registrado com sucesso.',data:{numseq_rgs_pessoa:789}};
  setMockStatus(resultTitle,result.res_code); out.textContent=pretty(result);
}
$('#rc-run').addEventListener('click',renderRc);
$('#rc-scenario').addEventListener('change',renderRc);
$('#rc-result').textContent=pretty({request_id:'MOCK-REGISTER-CUSTOMER',res_code:201,res_message:'Cliente registrado com sucesso.',data:{numseq_rgs_pessoa:789}});

function renderRo(){
  const out=$('#ro-result'); const resultTitle=out.closest('.mock-result').querySelector('.result-title');
  const body=parseMock($('#ro-body').value); const scenario=Number($('#ro-scenario').value);
  let result;
  if(scenario===400 || !body) result={request_id:'MOCK-REGISTER-ORDER',res_code:400,res_message:body?'Dados inválidos.':'JSON inválido.',data:{}};
  else if(scenario===500) result={request_id:'MOCK-REGISTER-ORDER',res_code:500,res_message:'Erro interno ao registrar o pedido.',data:{}};
  else result={request_id:'MOCK-REGISTER-ORDER',res_code:200,res_message:'Pedido registrado com sucesso.',data:{numseq_rgs_pedido:847}};
  setMockStatus(resultTitle,result.res_code); out.textContent=pretty(result);
}
$('#ro-run').addEventListener('click',renderRo);
$('#ro-scenario').addEventListener('change',renderRo);
$('#ro-result').textContent=pretty({request_id:'MOCK-REGISTER-ORDER',res_code:200,res_message:'Pedido registrado com sucesso.',data:{numseq_rgs_pedido:847}});

function renderOs(){
  const out=$('#os-result'); const resultTitle=out.closest('.mock-result').querySelector('.result-title');
  const order=Number($('#os-order').value)||12345; const status=$('#os-status').value; const scenario=Number($('#os-scenario').value);
  const descriptions={not_found:'Pedido não encontrado',received:'Pedido recebido',registered:'Pedido registrado na carteira de pedidos',preparing:'Pedido em preparação',invoiced:'Pedido faturado',canceled:'Pedido cancelado'};
  let result;
  if(scenario===400) result={request_id:'MOCK-ORDER-STATUS',res_code:400,res_message:'Parâmetros inválidos.',data:{}};
  else if(scenario===401) result={request_id:'MOCK-ORDER-STATUS',res_code:401,res_message:'Não autorizado.',data:{}};
  else if(scenario===500) result={request_id:'MOCK-ORDER-STATUS',res_code:500,res_message:'Erro interno ao consultar o pedido.',data:{}};
  else result={request_id:'MOCK-ORDER-STATUS',res_code:200,res_message:'Consulta realizada com sucesso',data:{order_id:order,status,status_message:descriptions[status]}};
  setMockStatus(resultTitle,result.res_code); out.textContent=pretty(result);
}
$('#os-run').addEventListener('click',renderOs);
$('#os-scenario').addEventListener('change',renderOs);
$('#os-status').addEventListener('change',renderOs);
$('#os-result').textContent=pretty({request_id:'MOCK-ORDER-STATUS',res_code:200,res_message:'Consulta realizada com sucesso',data:{order_id:12345,status:'registered',status_message:'Pedido registrado na carteira de pedidos'}});

setActive('inicio');
