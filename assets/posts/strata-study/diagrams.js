// Two invented placement states for the same two selected experts. No model inference.
for(const root of document.querySelectorAll('[data-strata-placement]')){
 root.querySelector('.st-controls').hidden=false;
 for(const button of root.querySelectorAll('[data-cache-state]'))button.addEventListener('click',()=>{
  const hit=button.dataset.cacheState==='hit';
  for(const b of root.querySelectorAll('[data-cache-state]'))b.setAttribute('aria-pressed',String(b===button));
  root.querySelector('[data-gpu-experts]').textContent=hit?'E2 + E5':'E2';
  root.querySelector('[data-cpu-experts]').textContent=hit?'담당 없음':'E5';
  root.querySelector('[data-cpu-source]').textContent=hit?'전문가 계산 없음':'RAM을 읽음';
  root.querySelector('[data-cpu-box]').setAttribute('class',hit?'st-inactive':'st-focus');
  for(const p of root.querySelectorAll('[data-cpu-path]'))p.style.display=hit?'none':'';
  root.querySelector('[data-wait-example]').hidden=hit;
  const status=hit?'선택은 E2와 E5 그대로다. 두 가중치가 모두 GPU 캐시에 있어 이 예시의 전문가 계산은 GPU가 맡는다.':'선택은 E2와 E5다. GPU는 캐시에 있는 E2를 계산하고 CPU는 RAM의 E5를 읽어 계산한다.';
  root.querySelector('[data-placement-status]').textContent=status;
  root.querySelector('[data-placement-desc]').textContent='설명용 배치 예시. '+status+' 실제 모델 실행 결과가 아니다.';
 });
}
