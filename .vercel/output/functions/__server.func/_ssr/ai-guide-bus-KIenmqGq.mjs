//#region node_modules/.nitro/vite/services/ssr/assets/ai-guide-bus-KIenmqGq.js
var Bus = class {
	handlers = /* @__PURE__ */ new Set();
	on(h) {
		this.handlers.add(h);
		return () => this.handlers.delete(h);
	}
	emit(p) {
		this.handlers.forEach((h) => h(p));
	}
};
var aiGuide = {
	ask: new Bus(),
	answer: new Bus(),
	notify: new Bus(),
	mode: new Bus()
};
var pending = /* @__PURE__ */ new Map();
aiGuide.answer.on((a) => {
	const cb = pending.get(a.id);
	if (cb) {
		cb(a.value);
		pending.delete(a.id);
	}
});
function aiNotify(n) {
	aiGuide.notify.emit(n);
}
function setAiGuideMode(m) {
	aiGuide.mode.emit(m);
}
//#endregion
export { aiNotify as n, setAiGuideMode as r, aiGuide as t };
