// SWIFT AI — Tamil Nadu Factories Act Monthly Compliance Checklist
// Sourced from the Luminous Power Technologies Pvt Ltd monthly report format.
// 226 statutory checkpoints across Factories Act, PW, Apprentices, Perm Status,
// EECN, Subsistence, MW, Equal Rem, Standing Orders, LWF, ESI, EPF, Child Labour,
// Maternity, Bonus, Gratuity, N&F Holidays, EC, CLRA, PT, POSH.

export type SeedStatus = "P" | "D" | "N" | "NA";
export type ChecklistItem = {
  n: number;
  act: string;
  compliance: string;
  description: string;
  seed: SeedStatus;
};

// Compact pipe-delimited seed rows: n|actKey|compliance|description|seed
// Act keys — expanded below via ACT_MAP.
const ACT_MAP: Record<string, string> = {
  FA: "Factories Act, 1948 & TN Factories Rules 1950",
  FASO: "Factories Act 1948 and the Tamilnadu Safety Officers Rules 2005",
  FAWO: "Factories Act 1948 and Tamilnadu Welfare Officers Act, 1973",
  PW: "The Payment of Wages Act - 1936 and Tamilnadu Rules 1937",
  APP: "The Apprentices Act, 1961 and the Apprenticeship Rules, 1991",
  PERM: "TN Industrial Establishments (Conferment of Permanent Status to Workmen) Act 1981",
  EECN: "The Employment Exchanges (Compulsory Notification of Vacancies) Act 1959 & Rules 1960",
  SUB: "TN Payment of Subsistence Allowance Act - 1981 and Rules 1981",
  MW: "The Minimum Wages Act - 1948 and Tamilnadu Rules 1953",
  ER: "The Equal Remuneration Act 1976 & Rules 1976",
  SO: "The Industrial Employment (Standing Orders) Act 1946 and TN Rules 1953",
  LWF: "The Tamilnadu Labour Welfare Fund Act 1972 and Rules 1973",
  ESI: "The Employees' State Insurance Act 1948",
  EPF: "The Employees' Provident Funds & Miscellaneous Provisions Act 1952",
  CL: "Tamilnadu Child Labour Regulation and Abolition Act",
  MB: "The Maternity Benefit Act 1961 and Rules 1963",
  BON: "The Payment of Bonus Act 1965 & Rules 1975",
  GRA: "The Payment of Gratuity Act 1972 & TN Rules 1972",
  NFH: "TN Industrial Establishments (National and Festival Holidays) Act 1958 & Rules 1959",
  EC: "The Employee Compensation Act 1923 and TN Workmen Compensation Rules 1934",
  CLRA: "The Contract Labour (Regulation & Abolition) Act 1970 and Rules 1975",
  PT: "Profession Tax Act 1975",
  POSH: "Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act 2013",
};

const ROWS: string = `
1|FA|Manager nominated/appointed by the Occupier|Manager - a person nominated or appointed as such by the occupier of the factory|P
2|FA|Occupier|Occupier of a factory means the person who has ultimate control over the affairs of the Factory|P
3|FA|Application for permission to Construct, Extend or take into any building as a Factory|Approval of site, construction or extension of factory|P
4|FA|Application for registration and Grant of License|Registration and grant of license or to renew license|P
5|FA|Grant of license|Registration and grant of license or to renew license|P
6|FA|Amendment of Licence|Change in Directors, Occupier, strength, HP or manufacturing process|P
7|FA|Renewal of License|Renewal 2 months before due date with treasury receipt to DISH|P
8|FA|Transfer of license|Transfer of license to another person before expiry|NA
9|FA|Notice of change of Manager|Within 7 days from the date of change|P
10|FA|Stability Certificate|From competent person before starting manufacturing process (3 yr validity)|P
11|FA|Health Register|Form 17 — record of medical exam for dangerous/hazardous process workers|P
12|FA|Fitness certificate|Fitness certificate in Form 27|P
13|FA|Disclosing of information - Hazardous|Copy of hazardous information furnished to workers|P
14|FA|Safety & Health Policy|Written policy for hazardous units / factories employing >50 workers|P
15|FA|Onsite emergency plan|For factories covered under Section 2(cb) — Hazardous process|P
16|FA|Displayed Emergency Plan|On every floor area-wise in the Factory|P
17|FA|Information regarding hazardous process|Workers & public informed of safety measures during accident|P
18|FA|Handling/storage/disposal of hazardous substances|Approved by Chief Inspector; published to workers and public|P
19|FA|Information under Rule 62D & 62K|Copy sent to CIF and State Pollution Control Board|P
20|FA|Review of information Rule 62D & 62K|Review on process change or serious accident|NA
21|FA|Appointment of supervisors|Qualified persons per Rule 62S for hazardous substances|P
22|FA|Medical examination and Health records|Pre-employment + 6-monthly for hazardous workers (Form 17 & 39)|P
23|FA|Medical examination - periodicity|Once every 6 months after appointment|P
24|FA|Pre-employment & periodical exam records|Recorded in prescribed Form|P
25|FA|Safety committee|Equal number of worker & management reps|P
26|FA|Safety committee meeting|Date to be captured|P
27|FA|Safety Officer|1 safety officer for every 1000 employees|P
28|FA|Mock fire drill|Once in two months; records with photos|P
29|FA|Fire prevention & escape training|Measures to prevent outbreak/spread & train workers|P
30|FA|Emergency exit for high-hazard storage|Travel distance <=22.5m; 2 escape routes per room|P
31|FA|Reporting of dangerous occurrences|Within 12 hours - accident with fatal injury|NA
32|FA|Reporting of accident|Accident with fatal injury|NA
33|FA|OHC (51-200 workers)|Occupational health centre fully equipped|D
34|FA|OHC floor area|Room with 15 sq.m floor area|D
35|FA|OHC finishes|Smooth impervious floors and walls|P
36|FA|OHC equipment|Equipment as per schedule|D
37|FA|OHC Medical officer appointment|Medical officer to be appointed|D
38|FA|Medical officer availability|Readily available during medical emergencies|D
39|FA|Medical officer visits|At least twice per week|D
40|FA|OHC dressers|3 qualified dresser-cum-compounders on duty|N
41|FA|First aid box|Fully equipped and available|P
42|FA|Ambulance Van|Available and in use|P
43|FA|Ambulance driver-cum-mechanic|Full-time driver-cum-mechanic|P
44|FA|Ambulance helper|Full-time helper trained in first aid|N
45|FA|Ambulance stationing|Stationed at or near OHC|P
46|FA|Tie-up with nearby hospital|For factories with less than 200 workers|P
47|FA|Decontamination — drenching shower|51-200: 2+1 for every additional 50|P
48|FA|Eye-wash bottles|Sufficient number filled with distilled water|N
49|FA|Locker/drying room|Facility for clothing not worn during work & drying wet clothes|P
50|FA|Material Safety Data Sheet|MSDS for every hazardous material handled|P
51|FA|Exemption to disclosure (Hazardous)|Applicability of exemption under hazardous units|NA
52|FA|Notice regarding First Aid boxes|For hazardous process units|P
53|FA|First Aid trained persons|St. Johns Ambulance Association training|P
54|FA|Ambulance Room staffing|Medical Officer + qualified nurse/dresser + attendant per shift|N
55|FA|Work permit system|Hot/cold work, height, welding, vessel entry, blanket permit|P
56|FA|Risk assessment report|Evaluation of risk factors ascertained|P
57|FA|Emergency evacuation plan / route map|Written statement of policy for hazardous & >50 worker units|P
58|FA|Marking safe assembly points|Assembly points clearly marked|P
59|FA|Self contained breathing apparatus|Breathing apparatus for medical emergency|N
60|FA|Fire suit|Fire suit availability during fire emergency|P
61|FA|Traffic safety on internal roads|Speed breakers every 500m; dividers >16m; cautionary signals|P
62|FA|Speed restriction display|Speed limit boards inside factory|P
63|FA|Disposal of wastes|Effective arrangement per TNPCB Air & Water Act|P
64|FA|Review of policies for dangerous process|Review on change in manufacturing process|NA
65|FA|Pipe line safety|Flammable/explosive pipelines protected from mechanical damage|P
66|FA|Public address system|Provision of PA system|N
67|FA|Wind sack|Wind direction indicator for evacuation|P
68|FA|Fire hydrant system|Ring main designed as per standards|N
69|FA|Ventilation system|To maintain room temperature|P
70|FA|Monthly machinery examination|Test & certificate of certain machines|NA
71|FA|Temperature/pressure/relief valve testing|Prevention of fire due to ignition|P
72|FA|Sparking equipment in hazardous areas|No spark-generating electrical equipment in hazardous zones|P
73|FA|Earthing of machinery & pipe lines|Static charge earthed effectively|P
74|FA|Lime washing/painting record|Record of white washing|P
75|FA|Room temperature|Max wet bulb temp 30 C at 1.5m above floor|P
76|FA|Spittoons|Number and location provided|P
77|FA|Planting of trees|150+ workers: plant & maintain trees approved by DAO|P
78|FA|Form 35 - Register of specially trained adult workers|Register for adults near moving machinery|NA
79|FA|Form 36 - Hoist & lifts examination|Record particulars of examination of hoists & lifts|P
80|FA|Register of lifting machines/chains/ropes|Examination records|P
81|FA|Form 8 - Pressure vessel examination|Testing of gas holder, pressure plant or vessel|P
82|FA|Canteen|Ordinarily employing 250+ workers|NA
83|FA|Canteen seats vs strength|Seats for 30% of workers working at a time|P
84|FA|Medical exam of canteen workers|Food handlers examined every 12 months|NA
85|FA|Canteen committee|Managing committee for canteen|P
86|FA|Shelter, Locker and Rest room|Factories with 150+ workers|P
87|FA|Creche|Factories with 30+ women workers|NA
88|FA|Compensatory holidays in Form 25|Not more than 2 holidays per week|NA
89|FA|Muster roll for exempted workers (OT) Form 10|OT hours & payment recorded|NA
90|FA|Overtime slip|OT slips issued to workers|NA
91|FA|Notice of work Form 11|Period of work for adults in English & regional language|P
92|FA|Register of adult workers|Adult workers register maintained|P
93|FA|List of Supervision/Management/Confidential|List maintained|P
94|FA|Working Hours|Shift schedule|P
95|FA|Weekly holiday|Weekly off|P
96|FA|Spread Over|Not more than 10.5 hours|P
97|FA|Prohibition of Overlapping Shift|Overlapping of shift restriction|P
98|FA|Quarterly Overtime Limit|OT limits|NA
99|FA|Rest intervals|Statutory rest intervals|P
100|FA|Register & certificate of young workers|For factories permitting young persons|NA
101|FA|Register of Leave with Wages|Leave book|P
102|FA|Nomination|Payment of wages if worker dies|P
103|FA|Medical examination record|Pre-employment record for dangerous operations|P
104|FA|Further details of accident|Fatal accident report|NA
105|FA|Notice of poisoning or disease|Dangerous occurrence|NA
106|FA|Display of Factories Rules|TN Factory Rules & Act displayed|P
107|FA|Display of Notice|Working hours, holidays & intervals|P
108|FA|Half yearly return|Returns submitted|P
109|FA|Annual return|Combined Annual Return Form 22|P
110|FA|Muster roll Form 25|All workers|P
111|FA|Time card|Service card for each calendar month|P
112|FA|ID card|Photo identity card|P
113|FA|Register of Exemptions|Exemption details|NA
114|FA|Particulars of Rooms|Room particulars in factory|P
115|FA|Display of persons engaged per shop floor|Max workers per workroom per relay|P
116|FA|Per person space|Workers x 3.3 m3|P
117|FA|Display of Name board|In English and Tamil|P
118|FA|Fire Extinguishers|Prevention for exposure of substances|P
119|FASO|Fire Hydrant|Measures to prevent fire outbreak|N
120|FA|Fire fighting training|Emergency exit training|P
121|FAWO|Welfare Officer|1 WO for employee count >=500|NA
122|FAWO|Assistant Welfare Officer|Additional for count 2000-4000|NA
123|FAWO|Welfare Officer appointment vs engaged|As per strength|NA
124|PW|Register of fines|Maintained|P
125|PW|Register of deductions for damages/loss|Maintained|P
126|PW|Register of wages|Maintained|P
127|PW|Wage Slip|Maintained|P
128|PW|Register of advances|Maintained|P
129|PW|Annual return|Combined annual return|P
130|PW|Abstract of the act|Displayed|P
131|PW|Notice of rates of wages|Displayed|P
132|PW|Notice of wage period & wage date|Displayed|P
133|PW|Power to impose fine|Notice displayed|NA
134|PW|Particulars of Paymaster|Displayed|P
135|APP|Contract of apprenticeship training|Maintained|NA
136|APP|Work diary|Maintained|NA
137|APP|Register of attendance of trade apprentices|Maintained|NA
138|APP|Form 3 & 3A|Maintained|NA
139|APP|Form 4|Maintained|NA
140|APP|Form Apprenticeship 1|Maintained|NA
141|APP|Form Apprenticeship 2|Maintained|NA
142|APP|Form 3|Maintained|NA
143|APP|Hours of Work - Graduate Apprentices|42 to 48 hours/week|NA
144|APP|Hours of Work - Trade Apprentices|42 hours/week|NA
145|APP|Hours of Work - Trade Apprentices Night|Not between 10pm-6am|NA
146|APP|Payment of Stipend|Stipend paid|NA
147|APP|Casual Leave|Grant of leave|NA
148|APP|Medical Leave|Grant of leave|NA
149|PERM|Register of workmen|Maintained|P
150|PERM|Half yearly return|Submitted|P
151|EECN|Notification of vacancy|Maintained|P
152|EECN|Quarterly return|Submitted|P
153|EECN|Biennial return|Submitted alternate years|P
154|SUB|Register of employees under suspension|Maintained|P
155|SUB|Half yearly return|Submitted|P
156|MW|Register of fines|Maintained|P
157|MW|Register of deductions for damage/loss|Maintained|P
158|MW|Annual return|Combined annual return|P
159|MW|Register of overtime for workers|Maintained|P
160|MW|Muster roll|Maintained under Factories Act|P
161|MW|Wage Slip|Given through email|P
162|MW|Register of wages|Maintained under PW Act|P
163|MW|Register of employees|Maintained under Factories Act|P
164|MW|Abstract of the act|Displayed|P
165|ER|Register by employer|Maintained|P
166|SO|Certified Standing Orders|Displayed|D
167|SO|Abstract of the act/Display|Displayed|P
168|LWF|Statement of contributions|Contribution made|P
169|LWF|Register of wages|Maintained centrally at HO|P
170|LWF|Register of unpaid accumulations/fines/deductions|Maintained|P
171|ESI|Employers' registration form|Submitted|P
172|ESI|Annual Return|Submitted|P
173|ESI|Declaration form (TIC)|Updated online|P
174|ESI|Smart Card - Pechan card|Received for all applicable employees|P
175|ESI|Accident report|Maintained|NA
176|ESI|Accident book|Maintained|P
177|ESI|Register of employees|Maintained|P
178|ESI|Return of contributions|Half-yearly submission|P
179|ESI|Monthly contribution remittance challan|Online remittance|P
180|ESI|Inspection Book|Maintained|P
181|EPF|Establishment Code|Registration code|P
182|EPF|Nomination and Declaration form|On joining and change of status|P
183|EPF|Policy details - Annually (EDLI exempted units)|Maintained|NA
184|EPF|EDLI exemption - monthly return|Maintained|NA
185|EPF|Updation and allotment of PF account number|Maintained|P
186|EPF|Monthly contribution remittance|Before due date|P
187|EPF|International workers monthly statement|NIL return if no IW|P
188|EPF|Declaration from new joinee|Maintained|P
189|EPF|Inspection Book|Maintained|P
190|CL|Display of notice|Displayed|P
191|MB|Abstract of the Act|Displayed|P
192|MB|Maternity benefit Register|Maintained|P
193|MB|Annual Return|Submitted annually|P
194|BON|Register of computation of allocable surplus|Maintained|P
195|BON|Register of set-on & set-off allocable surplus|Maintained|P
196|BON|Register of bonus|Maintained|P
197|BON|Annual return|Submitted annually|P
198|GRA|Notice of opening|Submitted|P
199|GRA|Notice of Change|Maintained on change|NA
200|GRA|Notice of closure|At time of closure|NA
201|GRA|Nomination|Obtained & filed in personnel file|P
202|GRA|Application of gratuity by employee|Nomination Form I|NA
203|GRA|Notice for payment of gratuity|On such occurrence|NA
204|GRA|Abstract of the act|Displayed|P
205|GRA|Notice of authorized officer|Displayed|P
206|NFH|Proposal for festival holidays|Submitted|P
207|NFH|Notice of festival holidays|Submitted|P
208|NFH|Communication from Labour authority|Issued by DISH office|P
209|NFH|Application to change festival holidays|Confirmation from union/worker reps|NA
210|NFH|Statement of holidays|Prepared & submitted by 31 Dec|P
211|NFH|Notice to employees to work on N&F holidays|Submitted to JDISH|NA
212|EC|Annual Return|Submitted annually|P
213|EC|Abstract of the act|Displayed|P
214|CLRA|Application for Registration|Form I|P
215|CLRA|Grant of registration certificate|Amendment with change|P
216|CLRA|RC Amendment|As required|P
217|CLRA|Form of Certificate by Principal Employer|Issued to all contractors|P
218|CLRA|Register of contractors|Maintained|P
219|CLRA|Abstract of the act|Displayed|P
220|CLRA|Notice display|Displayed|P
221|CLRA|Annual return|Combined annual return|P
222|CLRA|Half-yearly return|Submitted by licensed contractors|P
223|PT|Half yearly payment|Paid at local Taxing office|P
224|PT|Code no./Zone|Panchayat code|NA
225|POSH|Annual Report|Submitted by 31 Dec|P
226|POSH|Constitution of Internal Complaints Committee|Formation of factory-level POSH committee|D
`.trim();

export const TN_MONTHLY_CHECKLIST: ChecklistItem[] = ROWS.split("\n").map((line) => {
  const [n, actKey, compliance, description, seed] = line.split("|");
  return {
    n: Number(n),
    act: ACT_MAP[actKey] ?? actKey,
    compliance,
    description,
    seed: (seed as SeedStatus) ?? "P",
  };
});
