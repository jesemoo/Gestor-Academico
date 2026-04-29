// ========================
//  GESTOR ACADÉMICO — app.js
// ========================

// --- Helpers ---
const $ = id => document.getElementById(id);
const qs = sel => document.querySelector(sel);
const qsa = sel => document.querySelectorAll(sel);

function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer') || (() => {
    const el = document.createElement('div');
    el.id = 'toastContainer';
    el.className = 'toast-container';
    document.body.appendChild(el);
    return el;
  })();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// --- LocalStorage ---
const LS = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: k => localStorage.removeItem(k),
};

// Keys
const KEYS = {
  usuario: 'usuarioRegistrado',
  sesion: 'sesionActiva',
  cursos: 'cursos',
  tareas: 'tareas',
  config: 'configuracion',
};

// --- Auth helpers ---
function getUsuario() { return LS.get(KEYS.usuario); }
function getSesion() { return LS.get(KEYS.sesion); }
function setSesion(correo) { LS.set(KEYS.sesion, { correo, timestamp: Date.now() }); }
function cerrarSesion() { LS.del(KEYS.sesion); window.location.href = 'login.html'; }
function requireAuth() {
  const sesion = getSesion();
  const usuario = getUsuario();
  if (!sesion || !usuario || sesion.correo !== usuario.correo) {
    window.location.href = 'login.html';
    return null;
  }
  return usuario;
}

// --- Cursos ---
function getCursos() { return LS.get(KEYS.cursos) || []; }
function saveCursos(cursos) { LS.set(KEYS.cursos, cursos); }

// --- Tareas ---
function getTareas() { return LS.get(KEYS.tareas) || []; }
function saveTareas(tareas) { LS.set(KEYS.tareas, tareas); }

// --- Config ---
function getConfig() {
  return LS.get(KEYS.config) || { tema: 'dark', mostrarCompletadas: true, nombreVisible: '' };
}
function saveConfig(cfg) { LS.set(KEYS.config, cfg); }

// --- Apply theme ---
function applyTheme() {
  const cfg = getConfig();
  document.documentElement.setAttribute('data-theme', cfg.tema === 'light' ? 'light' : '');
}

// --- Sidebar active ---
function setSidebarActive(page) {
  qsa('.nav-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

// --- Render sidebar user ---
function renderSidebarUser() {
  const u = getUsuario();
  if (!u) return;
  const cfg = getConfig();
  const nameEl = document.getElementById('sidebarName');
  const roleEl = document.getElementById('sidebarRole');
  const avatarEl = document.getElementById('sidebarAvatar');
  const visName = cfg.nombreVisible || u.nombres;
  if (nameEl) nameEl.textContent = visName;
  if (roleEl) roleEl.textContent = u.carrera;
  if (avatarEl) avatarEl.textContent = visName.charAt(0).toUpperCase();
}

// --- ID generator ---
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

// --- Validation ---
function validarEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function validarDNI(d) { return /^\d{8}$/.test(d); }

// ========================
//  REGISTRO
// ========================
function initRegistro() {
  const form = $('formRegistro');
  const errEl = $('errorMsg');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    errEl.classList.remove('show');

    const data = {
      nombres: $('nombres').value.trim(),
      apellidos: $('apellidos').value.trim(),
      correo: $('correo').value.trim(),
      dni: $('dni').value.trim(),
      password: $('password').value,
      carrera: $('carrera').value.trim(),
      ciclo: $('ciclo').value.trim(),
      ciudad: $('ciudad').value.trim(),
    };

    if (!data.nombres || !data.apellidos) return showErr('Nombres y apellidos son obligatorios.');
    if (!validarEmail(data.correo)) return showErr('Ingresa un correo válido.');
    if (!validarDNI(data.dni)) return showErr('El DNI debe tener 8 dígitos.');
    if (data.password.length < 6) return showErr('La contraseña debe tener al menos 6 caracteres.');
    if (!data.carrera || !data.ciclo || !data.ciudad) return showErr('Carrera, ciclo y ciudad son obligatorios.');

    if (getUsuario()) {
      const ex = getUsuario();
      if (ex.correo === data.correo) return showErr('Ya existe una cuenta con ese correo.');
    }

    LS.set(KEYS.usuario, data);
    setSesion(data.correo);
    window.location.href = 'dashboard.html';

    function showErr(msg) { errEl.textContent = msg; errEl.classList.add('show'); }
  });
}

// ========================
//  LOGIN
// ========================
function initLogin() {
  const form = $('formLogin');
  const errEl = $('errorMsg');
  if (!form) return;

  if (getSesion() && getUsuario()) {
    window.location.href = 'dashboard.html';
    return;
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    errEl.classList.remove('show');
    const correo = $('correo').value.trim();
    const password = $('password').value;
    const usuario = getUsuario();

    if (!usuario || usuario.correo !== correo || usuario.password !== password) {
      errEl.textContent = 'Correo o contraseña incorrectos.';
      errEl.classList.add('show');
      return;
    }

    setSesion(correo);
    window.location.href = 'dashboard.html';
  });
}

// ========================
//  DASHBOARD
// ========================
function initDashboard() {
  const usuario = requireAuth();
  if (!usuario) return;
  applyTheme();
  renderSidebarUser();
  setSidebarActive('dashboard');

  const cfg = getConfig();
  const cursos = getCursos();
  const tareas = getTareas();
  const pendientes = tareas.filter(t => t.estado === 'Pendiente');
  const completadas = tareas.filter(t => t.estado === 'Completada');

  const visName = cfg.nombreVisible || usuario.nombres;
  $('greetName').textContent = visName;

  $('totalCursos').textContent = cursos.length;
  $('totalTareas').textContent = tareas.length;
  $('tareasPendientes').textContent = pendientes.length;
  $('tareasCompletadas').textContent = completadas.length;

  const hoy = new Date();
  const proxima = pendientes
    .filter(t => new Date(t.fecha) >= hoy)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))[0];

  const nextEl = $('nextTask');
  if (proxima) {
    $('nextTaskTitle').textContent = proxima.titulo;
    $('nextTaskMeta').textContent = `📚 ${proxima.curso} · 📅 ${formatFecha(proxima.fecha)} · ${badgePrioridad(proxima.prioridad)}`;
    nextEl.style.display = '';
  } else {
    nextEl.style.display = 'none';
  }

  const recientes = tareas.slice(-5).reverse();
  const tbody = $('tareasRecientes');
  if (tbody) {
    tbody.innerHTML = recientes.length ? recientes.map(t => `
      <tr>
        <td>${t.titulo}</td>
        <td>${t.curso}</td>
        <td>${formatFecha(t.fecha)}</td>
        <td><span class="badge badge-${t.prioridad.toLowerCase()}">${t.prioridad}</span></td>
        <td><span class="badge badge-${t.estado.toLowerCase()}">${t.estado}</span></td>
      </tr>`).join('') : `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">📋</div><p>No hay tareas registradas</p></div></td></tr>`;
  }
}

// ========================
//  CURSOS
// ========================
function initCursos() {
  const usuario = requireAuth();
  if (!usuario) return;
  applyTheme();
  renderSidebarUser();
  setSidebarActive('cursos');

  let editId = null;

  function render() {
    const cursos = getCursos();
    const tbody = $('cursosList');
    const buscar = $('buscarCurso')?.value.toLowerCase() || '';
    const filtrados = cursos.filter(c => c.nombre.toLowerCase().includes(buscar));

    tbody.innerHTML = filtrados.length ? filtrados.map(c => `
      <tr>
        <td><strong>${c.nombre}</strong></td>
        <td>${c.docente}</td>
        <td>${c.horario}</td>
        <td>${c.aula}</td>
        <td><span style="font-family:'JetBrains Mono',monospace;font-size:13px">${c.creditos} cr.</span></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-secondary btn-sm btn-icon" onclick="editarCurso('${c.id}')" title="Editar">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="eliminarCurso('${c.id}')" title="Eliminar">🗑️</button>
          </div>
        </td>
      </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📚</div><h3>Sin cursos</h3><p>Agrega tu primer curso</p></div></td></tr>`;
  }

  window.editarCurso = id => {
    const c = getCursos().find(x => x.id === id);
    if (!c) return;
    editId = id;
    $('modalTitle').textContent = 'Editar Curso';
    $('cNombre').value = c.nombre;
    $('cDocente').value = c.docente;
    $('cHorario').value = c.horario;
    $('cAula').value = c.aula;
    $('cCreditos').value = c.creditos;
    $('modalCurso').classList.add('open');
  };

  window.eliminarCurso = id => {
    if (!confirm('¿Eliminar este curso?')) return;
    saveCursos(getCursos().filter(c => c.id !== id));
    showToast('Curso eliminado');
    render();
  };

  $('btnNuevoCurso').onclick = () => {
    editId = null;
    $('modalTitle').textContent = 'Nuevo Curso';
    $('formCurso').reset();
    $('modalCurso').classList.add('open');
  };

  $('btnCerrarModal').onclick = () => $('modalCurso').classList.remove('open');
  $('btnCancelar').onclick = () => $('modalCurso').classList.remove('open');

  $('formCurso').onsubmit = e => {
    e.preventDefault();
    const nombre = $('cNombre').value.trim();
    const docente = $('cDocente').value.trim();
    const horario = $('cHorario').value.trim();
    const aula = $('cAula').value.trim();
    const creditos = $('cCreditos').value.trim();

    if (!nombre || !docente || !horario || !aula || !creditos) {
      return showToast('Completa todos los campos del curso', 'error');
    }

    const cursos = getCursos();
    if (editId) {
      const idx = cursos.findIndex(c => c.id === editId);
      if (idx !== -1) cursos[idx] = { ...cursos[idx], nombre, docente, horario, aula, creditos };
      showToast('Curso actualizado');
    } else {
      cursos.push({ id: genId(), nombre, docente, horario, aula, creditos });
      showToast('Curso agregado');
    }
    saveCursos(cursos);
    $('modalCurso').classList.remove('open');
    render();
  };

  $('buscarCurso').oninput = render;
  render();
}

// ========================
//  TAREAS
// ========================
function initTareas() {
  const usuario = requireAuth();
  if (!usuario) return;
  applyTheme();
  renderSidebarUser();
  setSidebarActive('tareas');

  let editId = null;

  function populateCursoSelects() {
    const cursos = getCursos();
    const opts = '<option value="">Todos los cursos</option>' + cursos.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
    const opts2 = '<option value="">Seleccionar curso</option>' + cursos.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
    $('filtroCurso').innerHTML = opts;
    $('tCurso').innerHTML = opts2;
  }

  function render() {
    let tareas = getTareas();
    const cfg = getConfig();
    const filtroEstado = $('filtroEstado').value;
    const filtroCurso = $('filtroCurso').value;

    if (!cfg.mostrarCompletadas) tareas = tareas.filter(t => t.estado !== 'Completada');
    if (filtroEstado) tareas = tareas.filter(t => t.estado === filtroEstado);
    if (filtroCurso) tareas = tareas.filter(t => t.curso === filtroCurso);

    tareas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    $('tareasList').innerHTML = tareas.length ? tareas.map(t => `
      <tr>
        <td><strong>${t.titulo}</strong>${t.descripcion ? `<br><small style="color:var(--text-muted)">${t.descripcion.slice(0,60)}${t.descripcion.length>60?'…':''}</small>` : ''}</td>
        <td>${t.curso}</td>
        <td>${formatFecha(t.fecha)}</td>
        <td><span class="badge badge-${t.prioridad.toLowerCase()}">${t.prioridad}</span></td>
        <td><span class="badge badge-${t.estado.toLowerCase()}">${t.estado}</span></td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${t.estado === 'Pendiente' ? `<button class="btn btn-success btn-sm" onclick="completarTarea('${t.id}')">✔</button>` : ''}
            <button class="btn btn-secondary btn-sm btn-icon" onclick="editarTarea('${t.id}')">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="eliminarTarea('${t.id}')">🗑️</button>
          </div>
        </td>
      </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">✅</div><h3>Sin tareas</h3><p>Agrega tu primera tarea</p></div></td></tr>`;
  }

  window.completarTarea = id => {
    const tareas = getTareas();
    const t = tareas.find(x => x.id === id);
    if (t) { t.estado = 'Completada'; saveTareas(tareas); showToast('Tarea completada ✔'); render(); }
  };

  window.editarTarea = id => {
    const t = getTareas().find(x => x.id === id);
    if (!t) return;
    editId = id;
    $('modalTareaTitle').textContent = 'Editar Tarea';
    $('tTitulo').value = t.titulo;
    $('tCurso').value = t.curso;
    $('tFecha').value = t.fecha;
    $('tPrioridad').value = t.prioridad;
    $('tDescripcion').value = t.descripcion || '';
    $('tEstado').value = t.estado;
    $('modalTarea').classList.add('open');
  };

  window.eliminarTarea = id => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    saveTareas(getTareas().filter(t => t.id !== id));
    showToast('Tarea eliminada');
    render();
  };

  $('btnNuevaTarea').onclick = () => {
    editId = null;
    $('modalTareaTitle').textContent = 'Nueva Tarea';
    $('formTarea').reset();
    $('tEstado').value = 'Pendiente';
    $('modalTarea').classList.add('open');
  };

  $('btnCerrarModalTarea').onclick = () => $('modalTarea').classList.remove('open');
  $('btnCancelarTarea').onclick = () => $('modalTarea').classList.remove('open');

  $('formTarea').onsubmit = e => {
    e.preventDefault();
    const titulo = $('tTitulo').value.trim();
    const curso = $('tCurso').value;
    const fecha = $('tFecha').value;
    const prioridad = $('tPrioridad').value;
    const descripcion = $('tDescripcion').value.trim();
    const estado = $('tEstado').value;

    if (!titulo || !curso || !fecha) return showToast('Título, curso y fecha son obligatorios', 'error');

    const tareas = getTareas();
    if (editId) {
      const idx = tareas.findIndex(t => t.id === editId);
      if (idx !== -1) tareas[idx] = { ...tareas[idx], titulo, curso, fecha, prioridad, descripcion, estado };
      showToast('Tarea actualizada');
    } else {
      tareas.push({ id: genId(), titulo, curso, fecha, prioridad, descripcion, estado: 'Pendiente' });
      showToast('Tarea agregada');
    }
    saveTareas(tareas);
    $('modalTarea').classList.remove('open');
    render();
  };

  $('filtroEstado').onchange = render;
  $('filtroCurso').onchange = render;

  populateCursoSelects();
  render();
}

// ========================
//  PERFIL
// ========================
function initPerfil() {
  const usuario = requireAuth();
  if (!usuario) return;
  applyTheme();
  renderSidebarUser();
  setSidebarActive('perfil');

  function loadData() {
    const u = getUsuario();
    $('pNombres').value = u.nombres;
    $('pApellidos').value = u.apellidos;
    $('pCorreo').value = u.correo;
    $('pDNI').value = u.dni;
    $('pCarrera').value = u.carrera;
    $('pCiclo').value = u.ciclo;
    $('pCiudad').value = u.ciudad;
    $('pNombreCompleto').textContent = `${u.nombres} ${u.apellidos}`;
    $('pCorreoDisplay').textContent = u.correo;
    $('pAvatarBig').textContent = u.nombres.charAt(0).toUpperCase();
  }

  loadData();

  $('formPerfil').onsubmit = e => {
    e.preventDefault();
    const nombres = $('pNombres').value.trim();
    const apellidos = $('pApellidos').value.trim();
    const correo = $('pCorreo').value.trim();
    const dni = $('pDNI').value.trim();
    const carrera = $('pCarrera').value.trim();
    const ciclo = $('pCiclo').value.trim();
    const ciudad = $('pCiudad').value.trim();

    if (!nombres || !apellidos) return showToast('Nombres y apellidos obligatorios', 'error');
    if (!validarEmail(correo)) return showToast('Correo no válido', 'error');
    if (!validarDNI(dni)) return showToast('DNI debe tener 8 dígitos', 'error');
    if (!carrera || !ciclo || !ciudad) return showToast('Carrera, ciclo y ciudad son obligatorios', 'error');

    const u = getUsuario();
    LS.set(KEYS.usuario, { ...u, nombres, apellidos, correo, dni, carrera, ciclo, ciudad });
    setSesion(correo);
    showToast('Perfil actualizado ✔');
    renderSidebarUser();
    loadData();
  };

  $('btnEliminarCuenta').onclick = () => {
    if (!confirm('¿Seguro que deseas ELIMINAR tu cuenta? Esta acción borrará todos tus datos.')) return;
    Object.values(KEYS).forEach(k => LS.del(k));
    window.location.href = 'login.html';
  };
}

// ========================
//  CONFIGURACIÓN
// ========================
function initConfiguracion() {
  const usuario = requireAuth();
  if (!usuario) return;
  applyTheme();
  renderSidebarUser();
  setSidebarActive('configuracion');

  const cfg = getConfig();
  $('temaOscuro').checked = cfg.tema !== 'light';
  $('mostrarCompletadas').checked = cfg.mostrarCompletadas !== false;
  $('nombreVisible').value = cfg.nombreVisible || '';

  function save() {
    const newCfg = {
      tema: $('temaOscuro').checked ? 'dark' : 'light',
      mostrarCompletadas: $('mostrarCompletadas').checked,
      nombreVisible: $('nombreVisible').value.trim(),
    };
    saveConfig(newCfg);
    applyTheme();
    renderSidebarUser();
    showToast('Configuración guardada');
  }

  $('temaOscuro').onchange = save;
  $('mostrarCompletadas').onchange = save;
  $('formConfig').onsubmit = e => { e.preventDefault(); save(); };
}

// --- Format helpers ---
function formatFecha(f) {
  if (!f) return '-';
  const d = new Date(f + 'T00:00:00');
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}
function badgePrioridad(p) {
  const map = { Alta: '🔴 Alta', Media: '🟡 Media', Baja: '🟢 Baja' };
  return map[p] || p;
}