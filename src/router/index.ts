import { createRouter, createWebHistory } from "vue-router";
import DisplayInline from "@/features/display/DisplayInline.vue";
import ControlApp from "@/features/control/ControlApp.vue";

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "display-inline", component: DisplayInline },
    { path: "/control", name: "control", component: ControlApp }
  ]
});
