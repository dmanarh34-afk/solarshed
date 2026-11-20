/* Right-hand info panels: selection, engineering note, scale calculator, single-line. */
export function initPanels({ $, getSel }) {
  function switchTab(n) {
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === n));
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.id === 'tab-' + n));
  }
  document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  const kpi = () => `<div class="kpi"><div><b>60 x 100 kW</b><span>inverters, 15 per rack tier</span></div><div><b>6.0 MWac</b><span>~7.5 MWp DC at 1.25 ratio</span></div><div><b>6.3 MVA</b><span>0.8 / 33 kV step-up TX</span></div><div><b>5 panels</b><span>36 kV MV lineup</span></div></div>`;

  function renderInfo() {
    const el = $('#tab-sel'), sel = getSel();
    if (!sel) {
      el.innerHTML = '<h3>Nothing selected</h3><p class="sub">Click any inverter, LV cabinet, the transformer or an MV panel.</p>' + kpi();
      return;
    }
    const i = sel.userData.info;
    el.innerHTML = `<h3>${i.title}</h3><p class="sub">${i.sub}</p><table>${i.specs.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>`;
    if (i.breaker) {
      const b = document.createElement('p');
      b.innerHTML = '<button id="brk"></button> <span class="sub">toggles status lamps (visual only)</span>';
      el.appendChild(b);
      const btn = b.querySelector('#brk');
      const upd = () => { btn.textContent = i.breaker.closed ? 'Open breaker (trip)' : 'Close breaker'; };
      upd();
      btn.onclick = () => {
        i.breaker.closed = !i.breaker.closed;
        i.breaker.lampC.material.emissiveIntensity = i.breaker.closed ? 2.5 : 0.08;
        i.breaker.lampO.material.emissiveIntensity = i.breaker.closed ? 0.08 : 2.5;
        upd();
      };
    }
  }

  $('#tab-note').innerHTML = `
<h3>6 MW / 100 kW BoS summary</h3>
<p class="sub">60 x 100 kW = 6.0 MWac in one shed; DC side ~7.5 MWp at DC/AC 1.25.</p>
<ul>
<li><b>Inverter grouping:</b> 2 wall racks x 2 tiers x 15 units, 1.3 m pitch (0.3 m airflow/cable gap), 1.0 m aisle clearance. Each rack tier = 15 inverters = 1.5 MW on one 15 x 160 A MCCB cabinet; 4 cabinets + 5000 A main ACB. Back-to-back free-standing racks are the alternative if the hall must be shorter.</li>
<li><b>LV AC:</b> 800 V, 6.3 MVA = 4.5 kA at the transformer; busbar trunking 5000 A. Voltage drop inverter to ACB &lt;1 %.</li>
<li><b>Cable trench routing:</b> DC arrives from outside trenches through a wall gland strip (fire-stopped); AC leaves each inverter into a floor trench on its own ladder tray; one cross trench feeds the LV cabinets; separate MV trench (power) away from LV/control to keep segregation and bend radius (15 x OD).</li>
<li><b>Ventilation / heat:</b> 60 x ~1.5 kW + TX ~45 kW = ~135 kW. At dT 15 K needs ~7.5 m&sup3;/s: low filtered intake louvres, ceiling duct, roof exhaust fans; separate dust-sealed A/C for the MV room.</li>
<li><b>Transformer:</b> 6.3 MVA 0.8/33 kV Dyn11, uk 7 %, in an interlocked fence with temperature trip. (11 kV option: 330 A, 12 kV gear.)</li>
<li><b>MV protection:</b> 36 kV 1250 A 25 kA/1 s metal-clad gear, TX feeder VCB with 50/51, 50N/51N, 49 and ground-fault; IN/OUT feeders with directional/line protection; interlocked earth switches; internal-arc class IAC AFLR with exhaust duct.</li>
<li><b>Clearances:</b> 1.5 m arc-flash boundary and insulating mat in front of MV panels, 1.0 m minimum aisle at inverters and LV cabinets, 0.8 m behind/side of MV for exhaust and racking, two egress routes.</li>
<li><b>Fire / safety:</b> clean-agent in MV room, smoke detection, extinguishers, emergency lighting, perimeter earth ring.</li>
</ul>
<p class="sub">Typical/illustrative values for a concept model; confirm with short-circuit, arc-flash, thermal and earthing studies.</p>`;

  $('#tab-scale').innerHTML = `
<h3>Sizing calculator</h3>
<label class="row col">DC/AC ratio: <b id="rv">1.25</b><input type="range" id="ratio" min="100" max="150" value="125"></label>
<label class="row col">AC capacity (MWac): <b id="pv">6</b><input type="range" id="mwp" min="2" max="12" step="1" value="6"></label>
<div class="kpi" id="kpis"></div>
<p class="sub">Inverters 100 kW each; 15 per rack tier.</p>`;
  const calc = () => {
    const r = $('#ratio').value / 100, ac = +$('#mwp').value;
    $('#rv').textContent = r.toFixed(2); $('#pv').textContent = ac;
    const inv = ac * 10, mva = ac * 1.05, amp = mva * 1000 / (Math.sqrt(3) * 0.8), hv = mva * 1000 / (Math.sqrt(3) * 33);
    $('#kpis').innerHTML = [[inv, '100 kW inverters'], [(ac * r).toFixed(2) + ' MWp', 'DC array size'], [mva.toFixed(1) + ' MVA', 'step-up TX (1.05 x MWac)'], [amp.toFixed(0) + ' A', 'LV current at 800 V'], [hv.toFixed(0) + ' A', 'MV current at 33 kV'], [(ac * r / 0.6 * 1000).toFixed(0), 'modules @ 600 Wp (not modelled)']].map(([a, b]) => `<div><b>${a}</b><span>${b}</span></div>`).join('');
  };
  $('#ratio').addEventListener('input', calc); $('#mwp').addEventListener('input', calc); calc();

  const box = (y, h, stroke, l1, l2) => `<rect x="20" y="${y}" width="290" height="${h}" rx="4" stroke="${stroke}"/><text x="165" y="${y + 17}" text-anchor="middle">${l1}</text><text x="165" y="${y + 31}" text-anchor="middle" style="fill:#8ea0b2">${l2}</text>`;
  $('#tab-sld').innerHTML = `
<h3>Single-line: 6 MW block</h3>
<svg viewBox="0 0 330 440" width="100%" font-family="Arial"><g stroke="#8ea0b2" fill="none" stroke-width="2">
${box(10, 40, '#6b7a89', 'PV array field (DC strings)', 'not modelled in 3D')}
<path d="M165 50V80" stroke="#d0262e"/>
${box(80, 46, '#4fd0ff', '60 x 100 kW string inverters', '800 Vac, 6.0 MWac')}
<path d="M165 126V150" stroke="#e0a02e"/>
${box(150, 40, '#e0a02e', 'LV combiner + 5000 A ACB', '60 x MCCB feeders')}
<path d="M165 190V212" stroke="#e0a02e"/>
<circle cx="155" cy="226" r="14" stroke="#c07a2a"/><circle cx="175" cy="226" r="14" stroke="#c07a2a"/>
<text x="165" y="258" text-anchor="middle">6.3 MVA 0.8/33 kV Dyn11</text>
<path d="M165 240V272" stroke="#c8232c"/>
${box(272, 42, '#ff5a5a', '33 kV MV switchgear (IN / TX VCB / OUT)', '36 kV, 1250 A, 25 kA/1 s')}
<path d="M165 314V334" stroke="#c8232c"/>
${box(334, 40, '#ff5a5a', '33 kV outgoing feeder', 'to collector substation / grid')}
<path d="M165 374V394" stroke="#c8232c"/>
${box(394, 40, '#ffb020', 'Substation / grid connection', 'metering, grid protection')}
</g></svg>`;
  renderInfo();
  return { renderInfo, switchTab };
}
