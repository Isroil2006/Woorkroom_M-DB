const NavItem = require("../models/NavItem");
const Api = require("../models/Api");

// --- NAV ITEMS (MODULES & ACTIONS) ---

exports.getNavItems = async (req, res) => {
  try {
    const navItems = await NavItem.find().sort({ id: 1 });
    res.json(navItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createNavItem = async (req, res) => {
  try {
    const { key, id, actions } = req.body;
    const existing = await NavItem.findOne({ $or: [{ key }, { id }] });
    if (existing) {
      return res.status(400).json({ message: "Bu kalit yoki ID band." });
    }
    const navItem = new NavItem({ key, id, actions: actions || [] });
    const saved = await navItem.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateNavItem = async (req, res) => {
  try {
    const { id } = req.params; // _id of NavItem
    const { key, navId, actions } = req.body;

    const navItem = await NavItem.findById(id);
    if (!navItem) return res.status(404).json({ message: "Modul topilmadi." });

    if (key) navItem.key = key;
    if (navId) navItem.id = navId;
    if (actions) navItem.actions = actions;

    const saved = await navItem.save();
    res.json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteNavItem = async (req, res) => {
  try {
    const { id } = req.params;
    await NavItem.findByIdAndDelete(id);
    res.json({ message: "Modul o'chirildi." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- APIS ---

exports.getApis = async (req, res) => {
  try {
    const apis = await Api.find().sort({ _id: 1 });
    res.json(apis);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createApi = async (req, res) => {
  try {
    const { _id, path, method, module, description } = req.body;
    const existing = await Api.findById(_id);
    if (existing) {
      return res.status(400).json({ message: "Bu ID ga ega API mavjud." });
    }
    const api = new Api({ _id, path, method, module, description, apiId: _id });
    const saved = await api.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateApi = async (req, res) => {
  try {
    const { id } = req.params; // _id of Api
    const { path, method, module, description } = req.body;

    const api = await Api.findById(id);
    if (!api) return res.status(404).json({ message: "API topilmadi." });

    if (path) api.path = path;
    if (method) api.method = method;
    if (module) api.module = module;
    if (description) api.description = description;

    const saved = await api.save();
    res.json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteApi = async (req, res) => {
  try {
    const { id } = req.params;
    await Api.findByIdAndDelete(id);
    res.json({ message: "API o'chirildi." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
