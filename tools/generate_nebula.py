"""Regenerate the layered static nebula background for the Love particle scene."""
from pathlib import Path

SVG = r"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1600" preserveAspectRatio="xMidYMid slice">
<defs>
 <radialGradient id="blue"><stop stop-color="#087dff" stop-opacity=".38"/><stop offset=".38" stop-color="#0752b9" stop-opacity=".2"/><stop offset="1" stop-color="#01030b" stop-opacity="0"/></radialGradient>
 <radialGradient id="cyan"><stop stop-color="#00d9ff" stop-opacity=".3"/><stop offset=".42" stop-color="#0872cb" stop-opacity=".13"/><stop offset="1" stop-color="#01030b" stop-opacity="0"/></radialGradient>
 <radialGradient id="violet"><stop stop-color="#536cff" stop-opacity=".2"/><stop offset=".5" stop-color="#193b91" stop-opacity=".08"/><stop offset="1" stop-color="#01030b" stop-opacity="0"/></radialGradient>
 <linearGradient id="mist" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#126cff" stop-opacity="0"/><stop offset=".48" stop-color="#16baff" stop-opacity=".17"/><stop offset="1" stop-color="#2458ff" stop-opacity="0"/></linearGradient>
 <filter id="soft"><feGaussianBlur stdDeviation="34"/></filter>
 <filter id="fine"><feGaussianBlur stdDeviation="9"/></filter>
</defs>
<rect width="900" height="1600" fill="#01030b"/>
<g filter="url(#soft)">
 <ellipse cx="120" cy="430" rx="390" ry="270" fill="url(#blue)" transform="rotate(-28 120 430)"/>
 <ellipse cx="760" cy="650" rx="390" ry="300" fill="url(#cyan)" transform="rotate(28 760 650)"/>
 <ellipse cx="360" cy="1030" rx="450" ry="270" fill="url(#blue)" transform="rotate(18 360 1030)"/>
 <ellipse cx="820" cy="1260" rx="330" ry="250" fill="url(#violet)"/>
 <ellipse cx="160" cy="1430" rx="360" ry="210" fill="url(#cyan)"/>
 <ellipse cx="480" cy="170" rx="360" ry="220" fill="url(#violet)"/>
</g>
<g fill="none" stroke="url(#mist)" stroke-linecap="round" filter="url(#fine)">
 <path d="M-120 560 C80 390 190 690 390 540 S690 350 1030 510" stroke-width="36"/>
 <path d="M-100 900 C150 720 260 1040 470 850 S760 710 1030 860" stroke-width="26"/>
 <path d="M-90 1320 C150 1110 290 1430 510 1230 S790 1100 1030 1260" stroke-width="32"/>
</g>
<g fill="none" stroke="#39aaff" stroke-opacity=".12" stroke-width="1.5">
 <path d="M-40 370 C140 250 220 520 420 390 S740 230 960 360"/>
 <path d="M-50 760 C130 620 260 850 450 730 S760 600 960 720"/>
 <path d="M-40 1160 C160 1010 260 1280 470 1130 S760 990 960 1120"/>
 <path d="M-30 1480 C150 1350 280 1550 480 1430 S770 1320 960 1450"/>
</g>
<g fill="#8bdcff">
 <circle cx="82" cy="190" r="1.4" opacity=".65"/><circle cx="220" cy="300" r="1" opacity=".42"/>
 <circle cx="720" cy="190" r="1.5" opacity=".55"/><circle cx="820" cy="410" r="1" opacity=".5"/>
 <circle cx="120" cy="780" r="1.2" opacity=".55"/><circle cx="790" cy="920" r="1.4" opacity=".52"/>
 <circle cx="260" cy="1190" r="1" opacity=".45"/><circle cx="650" cy="1390" r="1.3" opacity=".58"/>
 <circle cx="430" cy="80" r="1" opacity=".4"/><circle cx="530" cy="1510" r="1" opacity=".5"/>
</g>
</svg>"""

destination = Path(__file__).resolve().parents[1] / "nebula.svg"
destination.write_text(SVG, encoding="utf-8")
print(f"Generated {destination.name}")
