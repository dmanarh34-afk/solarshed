/* Right-hand info panels: selection, engineering note, sizing calculator, single-line. Content per scene. */
const kpiHtml = (items) => `<div class="kpi">${items.map(([a, b]) => `<div><b>${a}</b><span>${b}</span></div>`).join('')}</div>`;
const sldBox = (y, h, stroke, l1, l2) => `<rect x="20" y="${y}" width="290" height="${h}" rx="4" stroke="${stroke}"/><text x="165" y="${y + 17}" text-anchor="middle">${l1}</text><text x="165" y="${y + 31}" text-anchor="middle" style="fill:#8ea0b2">${l2}</text>`;
const sld = (boxes) => {
  let y = 10, out = '';
  boxes.forEach(([h, stroke, l1, l2], i) => { out += (i ? `<path d="M165 ${y - 18}V${y}" stroke="${stroke}"/>` : '') + sldBox(y, h, stroke, l1, l2); y += h + 18; });
  return `<svg viewBox="0 0 330 ${y}" width="100%" font-family="Arial"><g stroke="#8ea0b2" fill="none" stroke-width="2">${out}</g></svg>`;
};

const CONTENT = {
  '6mw': {
    kpi: [['60 x 100 kW', 'inverters, 15 per rack tier'], ['6.0 MWac', '~7.5 MWp DC at 1.25 ratio'], ['6.3 MVA', '0.8 / 33 kV step-up TX'], ['5 panels', '36 kV MV lineup']],
    note: `
<h3>6 MW / 100 kW BoS summary</h3>
<p class="sub">60 x 100 kW = 6.0 MWac in one shed; DC side ~7.5 MWp at DC/AC 1.25.</p>
<ul>
<li><b>Inverter grouping:</b> 2 wall racks x 2 tiers x 15 units, 1.3 m pitch (0.3 m airflow/cable gap), 1.0 m aisle clearance. Each rack tier = 15 inverters = 1.5 MW on one 15 x 160 A MCCB cabinet; 4 cabinets + 5000 A main ACB.</li>
<li><b>LV AC:</b> 800 V, 6.3 MVA = 4.5 kA at the transformer; busbar trunking 5000 A. Voltage drop inverter to ACB &lt;1 %.</li>
<li><b>Cable trench routing:</b> DC arrives from outside trenches through a fire-stopped wall gland strip; AC leaves each inverter into a floor trench on its own ladder tray; one cross trench feeds the LV cabinets; separate MV trench keeps power segregated, bend radius 15 x OD.</li>
<li><b>Ventilation / heat:</b> 60 x ~1.5 kW + TX ~45 kW = ~135 kW. At dT 15 K needs ~7.5 m&sup3;/s: low filtered intake louvres, ceiling duct, roof exhaust fans; separate dust-sealed A/C for the MV room.</li>
<li><b>Transformer:</b> 6.3 MVA 0.8/33 kV Dyn11, uk 7 %, interlocked fence, temperature trip.</li>
<li><b>MV protection:</b> 36 kV 1250 A 25 kA/1 s metal-clad gear; TX feeder VCB 50/51, 50N/51N, 49; interlocked earth switches; IAC AFLR with arc exhaust duct.</li>
<li><b>Clearances:</b> 1.5 m arc-flash boundary + insulating mat at MV panels, 1.0 m aisles, 0.8 m behind/side of MV, two egress routes.</li>
<li><b>Fire / safety:</b> clean-agent in MV room, smoke detection, extinguishers, emergency lighting, earth ring.</li>
</ul>
<p class="sub">Typical/illustrative values for a concept model; confirm with studies.</p>`,
    scale: {
      title: 'Sizing calculator',
      ctl: `<label class="row col">DC/AC ratio: <b id="rv">1.25</b><input type="range" id="ratio" min="100" max="150" value="125"></label>
<label class="row col">AC capacity (MWac): <b id="pv">6</b><input type="range" id="mwp" min="2" max="12" step="1" value="6"></label>`,
      note: 'Inverters 100 kW each; 15 per rack tier.',
      calc: ($) => {
        const r = $('#ratio').value / 100, ac = +$('#mwp').value; $('#rv').textContent = r.toFixed(2); $('#pv').textContent = ac; const mva = ac * 1.05;
        return [[ac * 10, '100 kW inverters'], [(ac * r).toFixed(2) + ' MWp', 'DC array size'], [mva.toFixed(1) + ' MVA', 'step-up TX (1.05 x MWac)'], [(mva * 1000 / (Math.sqrt(3) * 0.8)).toFixed(0) + ' A', 'LV current at 800 V'], [(mva * 1000 / (Math.sqrt(3) * 33)).toFixed(0) + ' A', 'MV current at 33 kV'], [(ac * r / 0.6 * 1000).toFixed(0), 'modules @ 600 Wp (not modelled)']];
      },
    },
    sld: ['6 MW block', [[40, '#6b7a89', 'PV array (DC strings)', 'not modelled in 3D'], [46, '#4fd0ff', '60 x 100 kW string inverters', '800 Vac, 6.0 MWac'], [40, '#e0a02e', 'LV combiner + 5000 A ACB', '60 x MCCB feeders'], [40, '#c07a2a', '6.3 MVA 0.8/33 kV Dyn11', 'cast-resin step-up'], [42, '#ff5a5a', '33 kV MV switchgear (IN / TX VCB / OUT)', '36 kV, 1250 A, 25 kA/1 s'], [40, '#ffb020', 'Substation / grid connection', 'metering, grid protection']]],
  },
  '633kw': {
    kpi: [['6 x 100 kW', 'inverters on Unistrut rack'], ['600 kWac', 'for 633 kWp DC (ratio 1.055)'], ['630 kVA', '0.4 / 11 kV step-up TX'], ['3 panels', '11 kV RMU']],
    note: `
<h3>633 kWp DC / 6 x 100 kW AC summary</h3>
<p class="sub">Sizing: 633 kWp DC vs 600 kWac nominal = DC/AC 1.055 (almost 1:1, clipping negligible). Optional 7th inverter (outlined slot): 700 kWac, ratio 0.90, ~90 % loading and N+1 headroom.</p>
<ul>
<li><b>Inverters:</b> 6 x 100 kW, 400 Vac, 144 A each (866 A total) on a heavy-duty Unistrut frame with floor-anchored end posts; 0.3 m side, 0.5 m above and 1.0 m front clearance for airflow and service; integrated DC disconnects and bottom cable glands.</li>
<li><b>Cable routing:</b> DC feeders come from the outside trench through wall sleeves (sealed against water, rodents and fire) to the bottom glands; AC cables drop into a grated floor trench to the AC combiner (6 x 160 A MCCB, SPD, metering), then a 1250 A ACB and busbar trunking to the transformer. Controls/comms run in a perforated overhead tray, separated from power. MV cables use their own trench and exit through a fire-stopped transit.</li>
<li><b>Ventilation:</b> losses ~6 x 1.5 kW + TX ~7.5 kW = ~17 kW; at dT 15 K that is ~0.9 m&sup3;/s (3,400 m&sup3;/h). Low filtered louvres, two high exhaust fans over the rack, split A/C for the TX/RMU zone if ambient exceeds inverter derating limits.</li>
<li><b>Transformer:</b> 630 kVA cast-resin 0.4/11 kV Dyn11 (909 A LV, 33 A HV) in a fenced, key-interlocked bay.</li>
<li><b>MV protection:</b> 12 kV RMU (TX-protection VCB with 50/51, 50N/51N, 49 + two ring switches), earth switch interlocked with the switch, VPIS, internal-arc rated; LV ACB shunt-trips from the MV relay.</li>
<li><b>Clearances:</b> 1.2 m arc-flash boundary + insulating mat in front of the RMU, 1.0 m keep-clear in front of inverters and LV panels, 0.8 m behind/side of the RMU for exhaust, two exits, CO2 extinguishers.</li>
</ul>
<p class="sub">Typical/illustrative values for a concept model; confirm with studies.</p>`,
    scale: {
      title: 'DC / AC sizing',
      ctl: `<label class="row col">Inverters (100 kW): <b id="rv">6</b><input type="range" id="ratio" min="5" max="8" step="1" value="6"></label>
<label class="row col">DC array (kWp): <b id="pv">633</b><input type="range" id="mwp" min="500" max="800" step="1" value="633"></label>`,
      note: 'Default: 6 units, 633 kWp. Try 7 units for the redundant option.',
      calc: ($) => {
        const n = +$('#ratio').value, dc = +$('#mwp').value; $('#rv').textContent = n; $('#pv').textContent = dc; const ac = n * 100;
        return [[ac + ' kWac', 'AC nominal'], [(dc / ac).toFixed(3), 'DC/AC ratio'], [(100 * Math.min(ac, dc) / ac).toFixed(0) + ' %', 'peak inverter loading (DC-limited)'], [(ac / (Math.sqrt(3) * 0.4)).toFixed(0) + ' A', 'LV current at 400 V'], [(ac / 0.95 / (Math.sqrt(3) * 11)).toFixed(0) + ' A', 'MV current at 11 kV (pf 0.95)'], [Math.round(dc / 0.6) + '', 'modules @ 600 Wp (not modelled)']];
      },
    },
    sld: ['633 kW block', [[40, '#6b7a89', 'PV array 633 kWp (DC strings)', 'not modelled in 3D'], [46, '#4fd0ff', '6 x 100 kW string inverters', '400 Vac, 600 kWac (7th slot optional)'], [40, '#e0a02e', 'AC combiner + 1250 A ACB', '6 x 160 A MCCB, SPD, meter'], [40, '#c07a2a', '630 kVA 0.4/11 kV Dyn11', 'cast-resin step-up'], [42, '#ff5a5a', '11 kV RMU (TX prot. / Ring IN / OUT)', '12 kV, 630 A, 20 kA/1 s'], [40, '#ffb020', 'Grid connection point', 'metering, grid protection']]],
  },
};

export function initPanels({ $, getSel }) {
  let id = '6mw';
  const C = () => CONTENT[id];
  function switchTab(n) {
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === n));
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.id === 'tab-' + n));
  }
  document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  function renderInfo() {
    const el = $('#tab-sel'), sel = getSel();
    if (!sel) { el.innerHTML = '<h3>Nothing selected</h3><p class="sub">Click any inverter, LV cabinet, the transformer or an MV panel.</p>' + kpiHtml(C().kpi); return; }
    const i = sel.userData.info;
    el.innerHTML = `<h3>${i.title}</h3><p class="sub">${i.sub}</p><table>${i.specs.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>`;
    const b = i.breaker;
    if (!b) return;
    const p = document.createElement('p');
    p.innerHTML = '<button id="brk"></button> ' + (b.lampE ? '<button id="ear"></button> ' : '') + '<span class="sub" id="msg">toggles status lamps (visual only)</span>';
    el.appendChild(p);
    const btn = p.querySelector('#brk'), ear = p.querySelector('#ear'), msg = p.querySelector('#msg');
    const lamps = () => {
      b.lampC.material.emissiveIntensity = b.closed ? 2.5 : 0.08; b.lampO.material.emissiveIntensity = b.closed ? 0.08 : 2.5;
      if (b.lampE) { b.lampE.material.emissiveIntensity = b.earth ? 2.5 : 0.08; b.lampN.material.emissiveIntensity = b.earth ? 0.08 : 1.6; }
      btn.textContent = b.closed ? 'Open switch' : 'Close switch';
      if (ear) ear.textContent = b.earth ? 'Open earth switch' : 'Close earth switch';
    };
    lamps();
    btn.onclick = () => { if (!b.closed && b.earth) { msg.textContent = 'Interlock: open the earth switch first'; return; } b.closed = !b.closed; msg.textContent = ''; lamps(); };
    if (ear) ear.onclick = () => { if (b.closed) { msg.textContent = 'Interlock: open the switch first'; return; } b.earth = !b.earth; msg.textContent = ''; lamps(); };
  }

  function setScene(newId) {
    id = newId;
    const c = C();
    $('#tab-note').innerHTML = c.note;
    $('#tab-scale').innerHTML = `<h3>${c.scale.title}</h3>${c.scale.ctl}<div class="kpi" id="kpis"></div><p class="sub">${c.scale.note}</p>`;
    const calc = () => { $('#kpis').innerHTML = c.scale.calc($).map(([a, b]) => `<div><b>${a}</b><span>${b}</span></div>`).join(''); };
    $('#ratio').addEventListener('input', calc); $('#mwp').addEventListener('input', calc); calc();
    $('#tab-sld').innerHTML = `<h3>Single-line: ${c.sld[0]}</h3>${sld(c.sld[1])}`;
    renderInfo();
  }
  return { renderInfo, switchTab, setScene };
}
