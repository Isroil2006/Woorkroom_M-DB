const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const NavItem = require("../../models/NavItem");

const navItemsData = [
  {
    key: "nav_dashboard",
    id: 100100,
    actions: []
  },
  {
    key: "nav_payments",
    id: 100200,
    actions: []
  },
  {
    key: "nav_tasks",
    id: 100300,
    actions: [
      { key: "task_add_project", defaultValue: true, id: 100301 },
      { key: "task_add_task", defaultValue: true, id: 100302 },
      { key: "task_edit_task", defaultValue: true, id: 100303 },
      { key: "task_delete_task", defaultValue: true, id: 100304 },
      { key: "task_delete_project", defaultValue: true, id: 100305 }
    ]
  },
  {
    key: "nav_vacations",
    id: 100400,
    actions: [
      { key: "vac_add_tour", defaultValue: true, id: 100401 },
      { key: "vac_edit_tour", defaultValue: true, id: 100402 },
      { key: "vac_delete_tour", defaultValue: true, id: 100403 }
    ]
  },
  {
    key: "nav_employees",
    id: 100500,
    actions: [
      { key: "emp_perm_btn", defaultValue: true, id: 100501 },
      { key: "emp_edit_btn", defaultValue: true, id: 100502 },
      { key: "emp_delete_btn", defaultValue: true, id: 100503 }
    ]
  },
  {
    key: "nav_messenger",
    id: 100600,
    actions: []
  },
  {
    key: "nav_infoportal",
    id: 100700,
    actions: []
  },
  {
    key: "nav_settings",
    id: 100800,
    actions: []
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB ga ulandi...");

    await NavItem.deleteMany({});
    try {
      await NavItem.collection.dropIndexes();
    } catch (e) {
      console.log("Indexes already dropped or collection empty");
    }
    await NavItem.insertMany(navItemsData);

    console.log(`${navItemsData.length} ta NavItem muvaffaqiyatli saqlandi!`);
    process.exit(0);
  } catch (err) {
    console.error("Xatolik:", err);
    process.exit(1);
  }
}

seed();
