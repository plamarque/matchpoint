import { createApp } from "vue";
import { createPinia } from "pinia";
import { registerSW } from "virtual:pwa-register";
import App from "@/app/AppShell.vue";
import { router } from "@/router";
import "@/styles/main.css";

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");

registerSW({ immediate: true });
