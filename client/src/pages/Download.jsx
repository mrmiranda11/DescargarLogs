import { useState } from 'react'
import reactLogo from '../assets/react.svg'
import viteLogo from '/vite.svg'
import { ExternalLink } from 'lucide-react';
import '../App.css'

const URL_API = "http://localhost:3000/";


const Download = () => {
    const [formData, setFormData] = useState({
        selectedOption: '',
        checkboxesFile: {
            seo: false,
            karws: false,
            decisorws: false
        },
        checkboxesInstance: {
            instanceF: false,
            instanceG: false,
            instanceH: false
        },
        downloadByDate: false,
        selectedDate: ''

    });
    const [loading, setLoading] = useState(false);
    const [loadingTest, setLoadingTest] = useState(false);
    const [errors, setErrors] = useState({});
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState(""); // "success" o "error"
    const [showDialog, setShowDialog] = useState(false);
    const [formDialogSesion, setFormDialogSesion] = useState({
        usuario: '',
        contrasena: ''
    });
    const [logs, setLogs] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const today = new Date(); 
    today.setDate(today.getDate() - 1); // restar un día 
    const yesterday = today.toISOString().split("T")[0];

    const resetFormularioSesion = () => {
        setShowDialog(false);
        setFormDialogSesion({ usuario: '', contrasena: '' });
        setErrors({}); // limpias los errores 
    };

    const validarFormTestSftp = () => {
        const errors = {};
        if (!formDialogSesion.usuario) {
            errors.usuario = 'Debe ingresar el usuario';
        }
        if (!formDialogSesion.contrasena) {
            errors.contrasena = 'Debe ingresar una contraseña';
        }
        return errors;
    }

    const validarFormulario = () => {
        const errors = {};
        if (!formData.selectedOption) {
            errors.selectedOption = 'Debe seleccionar una opción';
        }

        if (!Object.values(formData.checkboxesFile).some((value) => value)) {
            errors.checkboxesFile = 'Debe seleccionar un log';
        }
        if (!Object.values(formData.checkboxesInstance).some((value) => value)) {
            errors.checkboxesInstance = 'Debe seleccionar una instancia';
        }
        if (formData.downloadByDate) {
            if (!formData.selectedDate.trim()) {
                errors.selectedDate = 'Debe ingresar una fecha';
            }
        } else {
            delete errors.selectedDate;
        }
        return errors;
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (type === 'checkbox') {
            // Detectar si el checkbox pertenece a checkboxesFile o checkboxesInstance
            const targetGroup = name.startsWith("instance")
                ? "checkboxesInstance"
                : "checkboxesFile";
            const newCheckboxes = {
                ...formData[targetGroup],
                [name]: checked,
            };

            setFormData((prev) => ({
                ...prev,
                [targetGroup]: newCheckboxes,
            }));

            // limpiar error del grupo de checkboxes si al menos uno está marcado
            if (Object.values(newCheckboxes).some((val) => val)) {
                setErrors({
                    ...errors,
                    [targetGroup]: "",
                });
            }

        } else {
            setFormData({
                ...formData,
                [name]: value
            });

            //limpiar error
            if (errors[name]) {
                setErrors({
                    ...errors,
                    [name]: ''
                });
            }
        }

    };

    const handleChangeDialog = (e) => {
        const { name, value } = e.target;

        // Actualizar el estado del formulario
        setFormDialogSesion((prev) => ({ ...prev, [name]: value }));

        // Si había error en ese campo, lo eliminamos
        setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[name];
            return newErrors;
        });
    };

    const handleDownDataChange = (checked) => {
        setFormData(prev => ({
            ...prev,
            downloadByDate: checked,
            selectedDate: checked ? prev.selectedDate : ''
        }))
    };

    const handleSubmitTestSftp = async (e) => {
        e.preventDefault();
        setLoadingTest(true)
        const newErrors = validarFormTestSftp();
        try {
            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                return;
            }
            const response = await fetch(URL_API + "test", {
                method: "POST",
                headers: { 'Content-type': 'application/json' },
                body: JSON.stringify({
                    usuario: formDialogSesion.usuario,
                    contrasena: formDialogSesion.contrasena,
                })
            });

            const data = await response.json();

            if (!response.ok) {
                handleToast("error", `Error: ${data.error || data.message}`);
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            if (data.code === 200) {
                resetFormularioSesion();
                handleToast("success", "Conexión realizada con exito");
            }

        } catch (error) {
            handleToast("error", `Error: ${error.message}`);
        } finally {
            setLoadingTest(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true)
        setLogs([]);
        const newErrors = validarFormulario();
        try {

            //debugger;
            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                return;
            }

            const checkFileActivo = Object.keys(formData.checkboxesFile).filter((key) => formData.checkboxesFile[key]);
            //alert(`Opción seleccionada: ${formData.selectedOption}`);
            //Se hace la peticion sftp
            const response = await fetch(URL_API + "sftp", {
                method: "POST",
                headers: { 'Content-type': 'application/json' },
                body: JSON.stringify({
                    selectedOption: formData.selectedOption,
                    checkboxesFile: formData.checkboxesFile,
                    checkboxesInstance: formData.checkboxesInstance,
                    downloadByDate: formData.downloadByDate,
                    selectedDate: formData.selectedDate
                })
            });
            // Leer el stream 
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                setIsProcessing(true);
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });

                // Cada mensaje SSE termina con "\n\n"
                chunk.split("\n\n").forEach((line) => {
                    
                    if (line.startsWith("data:")) {
                        const json = JSON.parse(line.replace("data: ", ""));
                        //console.log("Evento:", json.message, json.type);
                        addLog(json);
                    }
                    if (line.startsWith("Error")) {
                        const error = { type: "error", message: "Archivo no encontrado" };
                        console.log(error);
                        addLog(error);
                    }
                });
            }


            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            //const data = await response.json();
            //debugger;
            /*if(data.code==255){
                setShowDialog(true);
                handleToast("error",`${data.message}`); 
            }*/
        } catch (error) {
            handleToast("error", `Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleToast = (toastType, message) => {
        setToastType(toastType)
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 6000);
    };

    function getLogClass(type) {
        switch (type) {
            case "error":
                return "text-red-600 bg-red-50";
            case "info":
                return "text-yellow-700 bg-yellow-50";
            case "INFO":
                return "text-blue-600 bg-blue-50";
            case "server":
                return "text-gray-600 bg-gray-50";
            case "progress":
                return "mb-1 px-2 py-1 rounded";
            default:
                return "text-gray-600 bg-gray-50";
        }
    }

    const addLog = (message) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [
            ...prev,
            { ...message, timestamp }
        ]);
        //setLogs(prev => [...prev, `[${timestamp}] ${message.message}`]);
    };



    return (

        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4 mb-0">

            {/* Dialog Modal Usuario Sftp*/}
            {showDialog && (
                <form onSubmit={handleSubmitTestSftp}>
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
                        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                                Diálogo Modal
                            </h2>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        Usuario
                                    </label>
                                    <input
                                        name='usuario'
                                        value={formDialogSesion.usuario}
                                        onChange={handleChangeDialog}
                                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${errors.usuario ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                                    />
                                    <div className='flex items-center cursor-pointer col-span-3'>
                                        {errors.usuario && (
                                            <p className='flex items-center cursor-pointer mt-2 text-red-600'>
                                                {errors.usuario}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        name='contrasena'
                                        value={formDialogSesion.contrasena}
                                        onChange={handleChangeDialog}
                                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${errors.contrasena ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                                    />
                                    <div className='flex items-center cursor-pointer col-span-3'>
                                        {errors.contrasena && (
                                            <p className='flex items-center cursor-pointer mt-2 text-red-600'>
                                                {errors.contrasena}
                                            </p>
                                        )}
                                    </div>
                                </div>

                            </div>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={resetFormularioSesion}
                                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition duration-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className={`px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-200
                                    ${loadingTest
                                            ? "bg-blue-600 text-white cursor-not-allowed opacity-50"
                                            : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg"}`}
                                >
                                    Aceptar
                                </button>
                            </div>
                        </div>
                    </div>

                </form>

            )}

            {/* Toast Notification */}
            {showToast && (
                <div className="fixed bottom-8 right-8 z-50 animate-slide-in w-[350px]">
                    <div
                        className={`px-6 py-4 rounded-lg shadow-lg flex items-start gap-3 border-l-4 
                    ${toastType === "success"
                                ? "bg-green-50 text-green-800 border-green-600"
                                : "bg-red-50 text-red-800 border-red-600"}`}
                    >
                        {/* Icono */}
                        <div className="pt-1">
                            {toastType === "success" ? (
                                <svg className="w-6 h-6 text-green-600" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16z" />   {/* círculo */}
                                    <path d="M7 10l2 2 4-4" />                       {/* check */}
                                </svg>
                            ) : (
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="9" y1="9" x2="15" y2="15" />
                                    <line x1="15" y1="9" x2="9" y2="15" />
                                </svg>
                            )}
                        </div>

                        {/* Texto */}
                        <div>
                            <div className="font-semibold">
                                {toastType === "success" ? "Éxito" : "Error"}
                            </div>
                            <div className="text-sm">{toastMessage}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Formulario */}
            <div className="bg-white rounded-lg shadow-lg p-8 w-full w-fit max-w-md">
                <div className='flex items-center justify-center mb-6'>
                    <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-3 rounded-full mr-3">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-8 h-8 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 11v6m0 0l-2-2m2 2l2-2"
                            />
                        </svg>
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center pb-4">
                    Seleccione una opción
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className="flex justify-around items-center mb-8 gap-2">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="selectedOption"
                                value="DEMO"
                                checked={formData.selectedOption === 'DEMO'}
                                onChange={handleChange}
                                className="w-5 h-5 text-blue-600 cursor-pointer"
                            />
                            <span className="ml-2 text-gray-700">DEMO</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="selectedOption"
                                value="PROD"
                                checked={formData.selectedOption === 'PROD'}
                                onChange={handleChange}
                                className="w-5 h-5 text-blue-600 cursor-pointer"
                            />
                            <span className="ml-2 text-gray-700">PROD</span>
                        </label>

                    </div>
                    {errors.selectedOption && (
                        <p className='flex items-center cursor-pointer mt-2 text-red-600'>
                            {errors.selectedOption}
                        </p>
                    )}
                    <div className="pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                            Archivos a descargar:
                        </h3>
                    </div>
                    <div className='items-center'>
                        <div className='grid grid-cols-3 items-center gap-6 pb-2'>
                            <label className='flex items-center cursor-pointer'>
                                <input
                                    type='checkbox'
                                    name='seo'
                                    checked={formData.checkboxesFile.seo}
                                    onChange={handleChange}
                                />
                                <span className="ml-2 text-gray-700">SEO</span>
                            </label>


                            <label className='flex items-center cursor-pointer'>
                                <input
                                    type='checkbox'
                                    name='karws'
                                    checked={formData.checkboxesFile.karws}
                                    onChange={handleChange}
                                />
                                <span className="ml-2 text-gray-700">KARWS</span>
                            </label>
                            <label className='flex items-center cursor-pointer'>
                                <input
                                    type='checkbox'
                                    name='decisorws'
                                    checked={formData.checkboxesFile.decisorws}
                                    onChange={handleChange}
                                />
                                <span className="ml-2 text-gray-700">DecisorWS</span>
                            </label>
                            <label className='flex items-center cursor-pointer col-span-3 '>
                                {errors.checkboxesFile && (
                                    <p className='flex items-center cursor-pointer mt-2 text-red-600'>
                                        {errors.checkboxesFile}
                                    </p>
                                )}
                            </label>
                        </div>
                    </div>
                    <div className="pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                            Seleccionar Instancias:
                        </h3>
                    </div>
                    <div className='items-center'>
                        <div className='grid grid-cols-3 items-center gap-6 pb-8'>
                            <label className='flex items-center cursor-pointer'>
                                <input
                                    type='checkbox'
                                    name='instanceF'
                                    checked={formData.checkboxesInstance.instanceF}
                                    onChange={handleChange}
                                />
                                <span className="ml-2 text-gray-700">Instancia F</span>
                            </label>


                            <label className='flex items-center cursor-pointer'>
                                <input
                                    type='checkbox'
                                    name='instanceG'
                                    checked={formData.checkboxesInstance.instanceG}
                                    onChange={handleChange}
                                />
                                <span className="ml-2 text-gray-700">Instancia G</span>
                            </label>
                            <label className='flex items-center cursor-pointer'>
                                <input
                                    type='checkbox'
                                    name='instanceH'
                                    checked={formData.checkboxesInstance.instanceH}
                                    onChange={handleChange}
                                />
                                <span className="ml-2 text-gray-700">Instancia H</span>
                            </label>
                            <label className='flex items-center cursor-pointer col-span-3 '>
                                {errors.checkboxesInstance && (
                                    <p className='flex items-center cursor-pointer mt-2 text-red-600'>
                                        {errors.checkboxesInstance}
                                    </p>
                                )}
                            </label>


                            <label className='flex items-center cursor-pointer col-span-3 '>
                                <input
                                    type='checkbox'
                                    checked={formData.downloadByDate}
                                    onChange={(e) => handleDownDataChange(e.target.checked)}
                                />
                                <span className="ml-2 text-gray-700">¿Descargar por fecha?</span>
                            </label>
                            {formData.downloadByDate && (
                                <>
                                    <div className='flex items-center cursor-pointer col-span-3'>
                                        <label className='block text-sm text-gray-600'>
                                            <span className="block text-sm text-gray-600">Seleccione la fecha</span>
                                        </label>
                                    </div>
                                    <div className='flex items-center cursor-pointer col-span-3'>
                                        <input
                                            type='date'
                                            name='selectedDate'
                                            value={formData.selectedDate}
                                            onChange={handleChange}
                                            max={yesterday}
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md'
                                        />

                                    </div>
                                    <div className='flex items-center cursor-pointer col-span-3'>
                                        {errors.selectedDate && (
                                            <p className='flex items-center cursor-pointer mt-2 text-red-600'>
                                                {errors.selectedDate}
                                            </p>
                                        )}
                                    </div>

                                </>
                            )}

                        </div>
                    </div>
                    <a className='pb-4 flex items-center gap-2 text-blue-700 hover:text-blue-400 transition-colors'
                        href="http://localhost:5174/read"  > 
                        <span className='text-base'>Ver Logs Monitor</span> 
                        <ExternalLink size={16}/>
                    </a>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-md hover:shadow-lg
                            ${loading
                                ? "bg-blue-600 text-white cursor-not-allowed opacity-50"
                                : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg"}`}
                    >
                        {loading ? 'Procesando...' : 'Descargar'}
                    </button>
                </form>
            </div>

            {/* Process */}
            {logs.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-8 w-3/4 mt-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Registro de Proceso</h2>
                    <div
                        className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto"
                        aria-live="polite"
                    >
                        {logs.length > 0 ? (
                            logs.map((log, index) => (
                                
                                <div key={index} className="flex items-start gap-3">
                                    <span className="mb-1 px-2 py-1 rounded">
                                        [{log.timestamp}]
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getLogClass(log.type)}`} >
                                        {log.message}
                                    </span>
                                    
                                </div>
                            ))
                        ) : (
                            <div className="text-gray-500 italic">No hay registros disponibles</div>
                        )}

                        {isProcessing && (
                            <div className="flex items-center space-x-2 mt-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span>{loading ? "Procesando..." : "Finalizado"}</span>
                            </div>
                        )}
                    </div>
                </div>

            )}
        </div>

    )
}

export default Download

