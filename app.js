// Página principal de ADMI.
// El catálogo sale de public.apps (proyecto Supabase "ADMI Apps"): para mostrar una app
// nueva basta con agregar su fila; no hace falta tocar esta página.
// Todas las apps viven bajo admi-gr.github.io, así que la sesión iniciada en
// cualquiera de ellas también se ve aquí.

const SUPABASE_URL = 'https://qizycxlubakoekorseqv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_pFhZ_u3DKzZ0fSnIsHVh_A_WR0RMwnU';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Por si Supabase no responde: la página no se queda vacía
const FALLBACK_APPS = [
    { slug: 'finanzas', name: 'Gestión Financiera', url: '/gestion-financiera/', icon: 'fa-wallet', color: '#2563EB',
      description: 'Cuentas, movimientos, compromisos y presupuestos personales' }
];

const esc = s => String(s ?? '').replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

// Solo enlaces del mismo sitio o https
const safeUrl = u => (/^(\/|https:\/\/)/.test(u || '') ? u : '#');
const safeColor = c => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : '#2563EB');
const safeIcon = i => (/^fa-[a-z0-9-]+$/.test(i || '') ? i : 'fa-cube');

function appCard(app, access) {
    const color = safeColor(app.color);
    const badge = access === undefined ? ''
        : access ? '<span class="badge ok"><i class="fas fa-check"></i> Tienes acceso</span>'
                 : '<span class="badge"><i class="fas fa-lock"></i> Sin acceso</span>';
    return `
        <a class="app-card" href="${esc(safeUrl(app.url))}" style="--app-color: ${color}">
            <span class="app-icon"><i class="fas ${safeIcon(app.icon)}"></i></span>
            <span class="app-text">
                <span class="app-name">${esc(app.name)}</span>
                <span class="app-desc">${esc(app.description)}</span>
            </span>
            <span class="app-foot">
                ${badge}
                <span class="app-open">Abrir <i class="fas fa-arrow-right"></i></span>
            </span>
        </a>
    `;
}

async function loadApps() {
    const { data, error } = await sb.from('apps')
        .select('slug, name, description, url, icon, color, sort_order')
        .order('sort_order').order('name');
    return error || !data ? FALLBACK_APPS : data;
}

async function loadSession() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return null;
    const [{ data: profile }, { data: access }] = await Promise.all([
        sb.from('profiles').select('display_name').maybeSingle(),
        sb.from('app_access').select('app_slug')
    ]);
    return {
        name: profile?.display_name || session.user.email,
        access: new Set((access || []).map(a => a.app_slug))
    };
}

async function render() {
    const grid = document.getElementById('appsGrid');
    const [apps, user] = await Promise.all([loadApps(), loadSession().catch(() => null)]);

    if (user) {
        document.getElementById('session').hidden = false;
        document.getElementById('sessionName').textContent = user.name;
        document.getElementById('sectionHint').textContent = `Hola, ${user.name}. Estas son las apps de ADMI.`;
    }

    grid.innerHTML = apps.length
        ? apps.map(a => appCard(a, user ? user.access.has(a.slug) : undefined)).join('')
        : '<p class="empty">Pronto habrá apps aquí.</p>';
    grid.setAttribute('aria-busy', 'false');
}

document.getElementById('signOutBtn').addEventListener('click', async () => {
    await sb.auth.signOut();
    location.reload();
});
document.getElementById('year').textContent = new Date().getFullYear();

render();
