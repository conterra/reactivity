import { createApp } from "vue";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import Playground from "./Playground.vue";

import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";

const vuetify = createVuetify({
    // Just use all components/directives for this playground -- no tree shaking.
    components: components,
    directives: directives,
    icons: {
        defaultSet: "mdi",
        aliases,
        sets: {
            mdi
        }
    }
});

const app = createApp(Playground);
app.use(vuetify);
app.mount("#app-root");
