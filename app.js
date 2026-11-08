
// =====================================
// CONEXIÓN CON SUPABASE
// =====================================

const SUPABASE_URL = "https://ngwioyxyebngziugpxys.supabase.co/";
const SUPABASE_KEY = "sb_publishable_Q2ZKCrqZHFW_ECtTpw-xrQ_Xd3Qa0Xy";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// =============================================
// CONFIGURACIÓN GENERAL
// =============================================

const codigoInput = document.getElementById("codigoEquipo");
const btnBuscar = document.getElementById("btnBuscar");
const resultado = document.getElementById("resultadoEquipo");

// Elementos de autenticación
const formLogin = document.getElementById("formLogin");
const panelLogin = document.getElementById("panelLogin");
const panelUsuario = document.getElementById("panelUsuario");
const usuarioActual = document.getElementById("usuarioActual");
const mensajeLogin = document.getElementById("mensajeLogin");
const btnCerrarSesion = document.getElementById("btnCerrarSesion");

// Dirección del repositorio técnico
const URL_REPOSITORIO = "https://airsupportgroup-my.sharepoint.com/:f:/g/personal/josue_carpio_go-airsupport_com/IgAP5f5fS4ctQLy8GqcrjZK-AZbfjlx21gD64Xml-yRedcs?e=f8hMoc";

let equipoSeleccionado = null;
let equipoActual = null;
let usuarioAutenticado = null;


// Estados permitidos
const estadosPermitidos = [
    "Operativo",
    "Inoperativo",
    "En mantenimiento",
    "Reporte de CEPA"
];


// =============================================
// AUTENTICACIÓN DE USUARIOS
// =============================================

// Actualizar la interfaz según la sesión
function actualizarInterfazSesion(session) {

    usuarioAutenticado = session?.user ?? null;

    const tieneSesion = Boolean(usuarioAutenticado);

    panelLogin.hidden = tieneSesion;
    panelUsuario.hidden = !tieneSesion;

    if (tieneSesion) {

        usuarioActual.textContent =
            usuarioAutenticado.email || "Usuario autenticado";

    }

    // Actualizar los controles del equipo consultado
    if (equipoActual) {
        mostrarEquipo(equipoActual);
    }
}


// Iniciar sesión
formLogin.addEventListener("submit", async function(event) {

    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const btnLogin = document.getElementById("btnLogin");

    mensajeLogin.textContent = "";

    btnLogin.disabled = true;
    btnLogin.textContent = "Ingresando...";

    const { data, error } = await db.auth.signInWithPassword({
        email: email,
        password: password
    });

    btnLogin.disabled = false;
    btnLogin.textContent = "Iniciar sesión";

    if (error) {

        console.error("Error de inicio de sesión:", error.message);

        mensajeLogin.textContent =
            "No se pudo iniciar sesión. Verifique su correo y contraseña.";

        return;
    }

    actualizarInterfazSesion(data.session);

    formLogin.reset();

    mensajeLogin.textContent = "";

    console.log("Sesión iniciada correctamente.");

});


// Cerrar sesión
btnCerrarSesion.addEventListener("click", async function() {

    btnCerrarSesion.disabled = true;

    const { error } = await db.auth.signOut();

    btnCerrarSesion.disabled = false;

    if (error) {

        console.error("Error al cerrar sesión:", error.message);

        alert("No se pudo cerrar la sesión.");

        return;
    }

    actualizarInterfazSesion(null);

    alert("Sesión cerrada correctamente.");

});


// Detectar cambios de sesión
db.auth.onAuthStateChange(function(event, session) {

    console.log("Estado de autenticación:", event);

    actualizarInterfazSesion(session);

});


// Comprobar si ya existe una sesión guardada
async function comprobarSesion() {

    const { data, error } = await db.auth.getSession();

    if (error) {

        console.error("Error al comprobar sesión:", error.message);

        return;
    }

    actualizarInterfazSesion(data.session);

}


// =============================================
// RESUMEN GENERAL DE ESTADOS
// =============================================

async function cargarResumenEstados() {

    const consultas = await Promise.all([

        db.from("equipos")
            .select("id", { count: "exact", head: true })
            .eq("activo", true)
            .eq("estado", "Operativo"),

        db.from("equipos")
            .select("id", { count: "exact", head: true })
            .eq("activo", true)
            .eq("estado", "Inoperativo"),

        db.from("equipos")
            .select("id", { count: "exact", head: true })
            .eq("activo", true)
            .eq("estado", "En mantenimiento"),

        db.from("equipos")
            .select("id", { count: "exact", head: true })
            .eq("activo", true)
            .eq("estado", "Reporte de CEPA")

    ]);

    const elementos = [
        "totalOperativos",
        "totalInoperativos",
        "totalMantenimiento",
        "totalCEPA"
    ];

    consultas.forEach((consulta, index) => {

        const elemento = document.getElementById(elementos[index]);

        if (consulta.error) {

            console.error(
                "Error al consultar estados:",
                consulta.error.message
            );

            elemento.textContent = "—";

        } else {

            elemento.textContent = consulta.count ?? 0;

        }

    });

}


// =============================================
// PROTEGER TEXTO MOSTRADO EN HTML
// =============================================

function escaparHTML(valor) {

    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =============================================
// BUSCAR EQUIPO
// =============================================

async function buscarEquipo() {

    const codigo = codigoInput.value.trim();

    if (!codigo) {

        resultado.innerHTML = `
            <p class="mensaje error">
                Por favor, ingrese el código del equipo.
            </p>
        `;

        codigoInput.focus();

        return;
    }

    btnBuscar.disabled = true;

    resultado.innerHTML = `
        <p class="mensaje">
            Buscando equipo...
        </p>
    `;

    const { data: equipo, error } = await db
        .from("equipos")
        .select(`
            id,
            codigo,
            marca,
            modelo,
            numero_serie,
            horometro,
            estado,
            activo,
            familias (
                nombre
            )
        `)
        .eq("codigo", codigo)
        .eq("activo", true)
        .maybeSingle();

    btnBuscar.disabled = false;

    if (error) {

        console.error("Error:", error.message);

        resultado.innerHTML = `
            <p class="mensaje error">
                Ocurrió un error al consultar el equipo.
            </p>
        `;

        return;
    }

    if (!equipo) {

        equipoSeleccionado = null;
        equipoActual = null;

        resultado.innerHTML = `
            <p class="mensaje error">
                No se encontró ningún equipo con el código
                <strong>${escaparHTML(codigo)}</strong>.
            </p>
        `;

        return;
    }

    mostrarEquipo(equipo);

}


// =============================================
// MOSTRAR INFORMACIÓN DEL EQUIPO
// =============================================

function mostrarEquipo(equipo) {

    equipoSeleccionado = equipo.id;
    equipoActual = equipo;

    const imagenEquipo =
        `https://ngwioyxyebngziugpxys.supabase.co/storage/v1/object/public/Repositorio_Image/${encodeURIComponent(equipo.codigo)}.webp`;

    console.log("Código:", equipo.codigo);
    console.log("URL imagen:", imagenEquipo);

    const estado = estadosPermitidos.includes(equipo.estado)
        ? equipo.estado
        : "Inoperativo";

    const tienePermiso = Boolean(usuarioAutenticado);

    // Controles visibles solamente para usuarios autenticados
    const controlesEdicion = tienePermiso ? `

        <div class="acciones">

            <button
                id="btnCambiarEstado"
                class="btn-estado">
                Cambiar estado
            </button>

            <button
                id="btnCambiarHorometro"
                class="btn-estado">
                Actualizar horómetro
            </button>

            <a
                href="${URL_REPOSITORIO}"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-info">
                Información técnica
            </a>

        </div>

        <div
            class="panel-estado"
            id="panelEstado"
            style="display: none;">

            <h3>Cambiar estado del equipo</h3>

            <select id="nuevoEstado">

                ${estadosPermitidos.map(opcion => `
                    <option
                        value="${escaparHTML(opcion)}"
                        ${opcion === estado ? "selected" : ""}>
                        ${escaparHTML(opcion)}
                    </option>
                `).join("")}

            </select>

            <button id="btnGuardarEstado">
                Guardar cambio
            </button>

        </div>

        <div
            class="panel-estado"
            id="panelHorometro"
            style="display: none;">

            <h3>Actualizar horómetro</h3>

            <label for="nuevoHorometro">
                Nueva lectura del horómetro
            </label>

            <input
                type="number"
                id="nuevoHorometro"
                min="0"
                step="any"
                value="${escaparHTML(equipo.horometro ?? 0)}"
                required
            >

            <button id="btnGuardarHorometro">
                Guardar horómetro
            </button>

        </div>

    ` : `

        <div class="acciones">

            <a
                href="${URL_REPOSITORIO}"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-info">
                Información técnica
            </a>

        </div>

        <p class="mensaje">
            Inicie sesión para modificar el estado o el horómetro.
        </p>

    `;


    resultado.innerHTML = `

        <div class="equipo">

            <div class="equipo-imagen">

                <img
                    src="${imagenEquipo}"
                    alt="Imagen del equipo ${escaparHTML(equipo.codigo)}"
                    onerror="this.parentElement.style.display='none'"
                >

            </div>


            <div class="equipo-header">

                <div>

                    <span class="etiqueta">
                        CÓDIGO DEL EQUIPO
                    </span>

                    <h2>${escaparHTML(equipo.codigo)}</h2>

                </div>

                <span class="estado">
                    ${escaparHTML(equipo.estado)}
                </span>

            </div>


            <div class="detalles">

                <p>
                    <strong>Familia:</strong>
                    ${escaparHTML(equipo.familias?.nombre || "Sin familia")}
                </p>

                <p>
                    <strong>Marca:</strong>
                    ${escaparHTML(equipo.marca || "No registrada")}
                </p>

                <p>
                    <strong>Modelo:</strong>
                    ${escaparHTML(equipo.modelo || "No registrado")}
                </p>

                <p>
                    <strong>Número de serie:</strong>
                    ${escaparHTML(equipo.numero_serie || "No registrado")}
                </p>

                <p>
                    <strong>Horómetro:</strong>
                    ${escaparHTML(equipo.horometro ?? 0)} horas
                </p>

            </div>


            ${controlesEdicion}

        </div>


        <!-- BOTÓN FUERA DE LA TARJETA -->

        <div class="nueva-consulta-contenedor">

            <button
                id="btnNuevaConsulta"
                class="btn-nueva-consulta">
                Nueva consulta
            </button>

        </div>

    `;


    // Activar eventos de los botones
    document.getElementById("btnNuevaConsulta")
        .addEventListener("click", nuevaConsulta);

    if (tienePermiso) {

        document.getElementById("btnCambiarEstado")
            .addEventListener("click", mostrarPanelEstado);

        document.getElementById("btnGuardarEstado")
            .addEventListener("click", actualizarEstado);

        document.getElementById("btnCambiarHorometro")
            .addEventListener("click", mostrarPanelHorometro);

        document.getElementById("btnGuardarHorometro")
            .addEventListener("click", actualizarHorometro);

    }

}


// =============================================
// MOSTRAR PANEL PARA CAMBIAR ESTADO
// =============================================

function mostrarPanelEstado() {

    document.getElementById("panelEstado").style.display = "block";

    document.getElementById("panelHorometro").style.display = "none";

}


// =============================================
// MOSTRAR PANEL PARA CAMBIAR HORÓMETRO
// =============================================

function mostrarPanelHorometro() {

    document.getElementById("panelHorometro").style.display = "block";

    document.getElementById("panelEstado").style.display = "none";

}


// =============================================
// ACTUALIZAR ESTADO EN SUPABASE
// =============================================

async function actualizarEstado() {

    if (!usuarioAutenticado) {

        alert("Debe iniciar sesión para realizar esta modificación.");

        return;
    }

    if (!equipoSeleccionado) {
        return;
    }

    const nuevoEstado = document.getElementById("nuevoEstado").value;

    if (!estadosPermitidos.includes(nuevoEstado)) {

        alert("El estado seleccionado no es válido.");

        return;
    }

    const btnGuardar = document.getElementById("btnGuardarEstado");

    btnGuardar.disabled = true;
    btnGuardar.textContent = "Guardando...";


    const { data, error } = await db
        .from("equipos")
        .update({
            estado: nuevoEstado
        })
        .eq("id", equipoSeleccionado)
        .eq("activo", true)
        .select("id")
        .maybeSingle();


    if (error || !data) {

        console.error("Error al actualizar estado:", error);

        alert(
            error
                ? "No se pudo actualizar el estado. Verifique la sesión y los permisos."
                : "No se encontró el equipo o no se pudo actualizar."
        );

        btnGuardar.disabled = false;
        btnGuardar.textContent = "Guardar cambio";

        return;
    }

    alert("Estado actualizado correctamente.");

    await recargarEquipoSeleccionado();

}


// =============================================
// ACTUALIZAR HORÓMETRO EN SUPABASE
// =============================================

async function actualizarHorometro() {

    if (!usuarioAutenticado) {

        alert("Debe iniciar sesión para realizar esta modificación.");

        return;
    }

    if (!equipoSeleccionado) {
        return;
    }

    const inputHorometro = document.getElementById("nuevoHorometro");

    const valorIngresado = inputHorometro.value.trim();

    if (valorIngresado === "") {

        alert("Ingrese la lectura del horómetro.");

        return;
    }

    const nuevoHorometro = Number(valorIngresado);

    if (!Number.isFinite(nuevoHorometro) || nuevoHorometro < 0) {

        alert("Ingrese una lectura válida. No se permiten valores negativos.");

        return;
    }

    const btnGuardar = document.getElementById("btnGuardarHorometro");

    btnGuardar.disabled = true;
    btnGuardar.textContent = "Guardando...";


    const { data, error } = await db
        .from("equipos")
        .update({
            horometro: nuevoHorometro
        })
        .eq("id", equipoSeleccionado)
        .eq("activo", true)
        .select("id")
        .maybeSingle();


    if (error || !data) {

        console.error("Error al actualizar horómetro:", error);

        alert(
            error
                ? "No se pudo actualizar el horómetro. Verifique la sesión y los permisos."
                : "No se encontró el equipo o no se pudo actualizar."
        );

        btnGuardar.disabled = false;
        btnGuardar.textContent = "Guardar horómetro";

        return;
    }

    alert("Horómetro actualizado correctamente.");

    await recargarEquipoSeleccionado();

}


// =============================================
// RECARGAR EQUIPO DESPUÉS DE UNA MODIFICACIÓN
// =============================================

async function recargarEquipoSeleccionado() {

    const codigo = codigoInput.value.trim();

    const { data: equipo, error } = await db
        .from("equipos")
        .select(`
            id,
            codigo,
            marca,
            modelo,
            numero_serie,
            horometro,
            estado,
            activo,
            familias (
                nombre
            )
        `)
        .eq("codigo", codigo)
        .eq("activo", true)
        .maybeSingle();


    if (error || !equipo) {

        console.error("Error al recargar equipo:", error);

        alert("El cambio se guardó, pero no se pudo actualizar la vista.");

        return;
    }

    mostrarEquipo(equipo);

    await cargarResumenEstados();

}


// =============================================
// NUEVA CONSULTA
// =============================================

function nuevaConsulta() {

    codigoInput.value = "";

    resultado.innerHTML = `
        <p class="mensaje-inicial">
            Ingrese un código para consultar un equipo.
        </p>
    `;

    equipoSeleccionado = null;
    equipoActual = null;

    codigoInput.focus();

}


// =============================================
// EVENTOS DEL BUSCADOR
// =============================================

btnBuscar.addEventListener("click", buscarEquipo);


codigoInput.addEventListener("keydown", function(event) {

    if (event.key === "Enter") {

        buscarEquipo();

    }

});


// =============================================
// INICIAR APLICACIÓN
// =============================================

async function iniciarAplicacion() {

    await comprobarSesion();

    await cargarResumenEstados();

    console.log("Taller GSE iniciado correctamente.");

}

iniciarAplicacion();
