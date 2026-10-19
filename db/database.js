const sqliteAdapter = require('./sqlite');
const postgresAdapter = require('./postgres');

let overrideDriver = null;

function getActiveDriver() {
    if (overrideDriver) {
        return overrideDriver;
    }
    if (process.env.DATABASE_URL) {
        return postgresAdapter;
    }
    return sqliteAdapter;
}

function setDriver(driverNameOrAdapter) {
    if (typeof driverNameOrAdapter === 'string') {
        if (driverNameOrAdapter === 'postgres') {
            overrideDriver = postgresAdapter;
        } else if (driverNameOrAdapter === 'sqlite') {
            overrideDriver = sqliteAdapter;
        } else {
            throw new Error(`Unknown database driver: ${driverNameOrAdapter}`);
        }
    } else {
        overrideDriver = driverNameOrAdapter;
    }
}

function resetDriver() {
    overrideDriver = null;
}

async function initDb(...args) {
    return await getActiveDriver().initDb(...args);
}

function getDb(...args) {
    return getActiveDriver().getDb(...args);
}

async function closeDb(...args) {
    return await getActiveDriver().closeDb(...args);
}

function mapTodo(...args) {
    return getActiveDriver().mapTodo(...args);
}

async function getAllTodos(...args) {
    return await getActiveDriver().getAllTodos(...args);
}

async function getTodoById(...args) {
    return await getActiveDriver().getTodoById(...args);
}

async function createTodo(...args) {
    return await getActiveDriver().createTodo(...args);
}

async function updateTodo(...args) {
    return await getActiveDriver().updateTodo(...args);
}

async function deleteTodo(...args) {
    return await getActiveDriver().deleteTodo(...args);
}

async function getDashboardCounts(...args) {
    return await getActiveDriver().getDashboardCounts(...args);
}

async function checkHealth(...args) {
    return await getActiveDriver().checkHealth(...args);
}

function getDriverName() {
    return getActiveDriver().getDriverName();
}

module.exports = {
    initDb,
    getDb,
    closeDb,
    mapTodo,
    getAllTodos,
    getTodoById,
    createTodo,
    updateTodo,
    deleteTodo,
    getDashboardCounts,
    checkHealth,
    getDriverName,
    getDriverType: getDriverName,
    setDriver,
    resetDriver,
    sqlite: sqliteAdapter,
    postgres: postgresAdapter
};
