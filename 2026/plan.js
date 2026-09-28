// Schematic floor plan geometry, traced from plan.jpg.
// Coordinates are in "trace units": plan.jpg shown at 2000px wide (1 unit = 2067/2000 image px).
// Rooms themselves come from BOX in data.js (percent of the image).
const PLAN = {
  // Outer building footprint (drawn first, neutral fill)
  footprint: [
    [200,272,570,78], [330,340,440,580], [355,570,70,152], [196,848,92,72],
    [220,916,1300,338], [55,935,168,322], [1418,448,102,472], [1352,450,68,98],
    [1505,916,95,337], [760,1250,450,250], [1085,1250,125,240]
  ],
  // Non-exhibition areas: [x,y,w,h,kind,label]
  areas: [
    [470,405,145,510,"patio","patio"], [460,975,315,220,"patio","patio"],
    [832,975,226,220,"patio","patio"], [1140,975,300,220,"patio","patio"],
    [695,400,73,120,"hall","auditorium"],
    [222,990,210,182,"dark","brabantzaal · catering"],
    [1058,975,26,220,"dark","abdij bar"],
    [815,1252,183,248,"grey","restaurant binnenhof"],
    [998,1252,70,122,"dark","restaurant porticato"],
    [1070,1252,138,238,"lobby","lobby · reception"],
    [355,572,68,148,"hall",""], [196,848,46,70,"hall",""], [242,848,46,70,"grey",""],
    [1530,1050,40,55,"grey",""]
  ],
  hexagon: [435,1363,66], // terrace pavilion: cx, cy, r
  // Zone corridors: [zone, x, y, w, h]
  corridors: [
    ["yellow",295,336,365,16], ["yellow",423,340,11,578], ["yellow",430,665,45,55],
    ["green",657,275,36,300], ["green",680,575,17,287], ["green",693,558,75,40],
    ["blue",220,960,865,16], ["blue",440,1235,630,16], ["blue",775,918,15,332],
    ["blue",430,975,15,275], ["blue",132,975,90,16], ["blue",132,975,16,215],
    ["blue",132,1175,300,16], ["blue",220,975,15,20],
    ["red",1085,960,425,16], ["red",1085,918,16,332], ["red",1070,1235,480,16],
    ["red",1468,452,20,466]
  ],
  // Slanted red corridor on the east side: polygon points
  slants: [["red","1505,962 1520,962 1560,1250 1545,1250"]],
  // Facilities: [kind, x, y]
  icons: [
    ["wc",329,330],["wc",453,533],["wc",453,787],["wc",446,917],["wc",476,938],
    ["wc",248,944],["wc",270,1012],["wc",329,1012],["wc",708,535],["wc",767,938],["wc",818,938],
    ["wc",876,1215],["wc",790,1215],["wc",1119,975],["wc",1139,938],["wc",1095,1272],
    ["wc",1525,1195],["wc",1444,493],["wc",1497,478],
    ["lift",452,290],["lift",1459,907],["lift",736,533],["lift",458,675],["lift",825,1203],["lift",1132,1203],
    ["info",446,345],["info",675,343],["info",675,466],["info",442,953],["info",661,953],
    ["info",783,953],["info",1092,953],["info",1480,953],["info",143,1087],["info",436,1243],
    ["info",781,1243],["info",1089,1243],["info",1541,1240],["info",1480,558],
    ["food",675,570],["food",1071,1127],["food",1548,1035],["food",93,1087],["food",340,1110],
    ["coat",388,295],["coat",1498,520],
    ["aid",1183,1478]
  ],
  // Entrances: [x, y, direction(down|left), label]
  entrances: [
    [410,215,"down","Main entrance · Zeeland foyer"],
    [1560,562,"left","Entrance 2 · Flevoland foyer"],
    [1275,1360,"left","Entrance 3 · NH Koningshof lobby"]
  ],
  // Zone badges: [zone, x, y]
  badges: [["yellow",270,544],["green",765,682],["blue",718,1089],["red",1371,1089]]
};
