import { createRouter, createWebHashHistory } from 'vue-router';

import Guide from './views/Guide.vue';
import Editor from './views/Editor.vue';
import Viewer from './views/Viewer.vue';
import Tools from './views/Tools.vue';
import Account from './views/Account.vue';
import Merger from './views/merger/Merger.vue';

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: '/', component: Guide },
        { path: '/editor', component: Editor },
        { path: '/viewer', component: Viewer },
        { path: '/tools', component: Tools },
        { path: '/account', component: Account },
        { path: '/merger', component: Merger },
    ],
});

export default router;
