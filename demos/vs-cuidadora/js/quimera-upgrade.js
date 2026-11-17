/* QuimeraDev: melhorias de conversão da demonstração */
(function(){
  // formulários: mensagem na própria página em vez de alert()
  document.querySelectorAll('form').forEach(function(f){
    var on=f.getAttribute('onsubmit')||'';
    if(on.indexOf('alert')>-1) f.removeAttribute('onsubmit');
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var box=f.querySelector('.q-form-ok');
      if(!box){box=document.createElement('p');box.className='q-form-ok';box.setAttribute('role','status');f.appendChild(box)}
      box.textContent='Pronto! Esta é uma demonstração: no site publicado, a sua mensagem chega direto para '+(document.body.dataset.marca||'a empresa')+'.';
    });
  });
  // barra de contato fixa no celular: aparece depois do topo da página
  var bar=document.querySelector('.q-sticky');
  if(bar){var t=0;function chk(){bar.classList.toggle('on',scrollY>420)}addEventListener('scroll',function(){if(!t){t=requestAnimationFrame(function(){t=0;chk()})}},{passive:true});chk()}
})();
