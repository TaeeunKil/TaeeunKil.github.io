// These routes are invented examples; no model inference is performed.
for (const root of document.querySelectorAll('[data-moe-router]')) {
  root.querySelector('.mv-controls').hidden=false;
  const states = {
    a: { selected:[2,5], weights:['0.7','0.3'], status:'벡터 A: 전문가 2번과 5번을 선택한다.' },
    b: { selected:[1,5], weights:['0.4','0.6'], status:'벡터 B: 전문가 1번과 5번을 선택한다.' }
  };
  for (const button of root.querySelectorAll('[data-route]')) {
    button.addEventListener('click', () => {
      const key=button.dataset.route, state=states[key];
      for(const b of root.querySelectorAll('[data-route]')) b.setAttribute('aria-pressed',String(b===button));
      for(const expert of root.querySelectorAll('[data-expert]')) {
        const id=Number(expert.dataset.expert), i=state.selected.indexOf(id);
        expert.dataset.selected=String(i>=0);
        expert.querySelector('[data-expert-status]').textContent=i>=0 ? `선택 ${state.weights[i]}` : '선택 안 됨';
      }
      root.querySelector('[data-route-input]').textContent=`토큰의 벡터 ${key.toUpperCase()}`;
      root.querySelector('[data-route-formula]').textContent=`${state.weights[0]} × E${state.selected[0]}(x) + ${state.weights[1]} × E${state.selected[1]}(x)`;
      root.querySelector('[data-route-status]').textContent=state.status;
      root.querySelector('[data-router-description]').textContent=`설명용 예시. ${state.status} 나머지 여섯 전문가는 이번 계산에서 선택되지 않는다. 선택된 두 출력의 가중합을 만든다.`;
    });
  }
}
