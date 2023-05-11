const VoximplantKit = require('@voximplant/kit-functions-sdk').default;

module.exports = async function (context, callback) {
const kit = new VoximplantKit(context)

const axios = require('axios');
  var phone_number;
  var cp;

//getDataByLocationAndType() funcion sirve para coger Incidencia_type (gas, electrricidad...) y "ciudad" (LAZO, AMARRA, 2435, cp,...)

  async function getDataByLocationAndType() {
    console.log("inicia getDataByLocationAndType();");

    // Obteniendo las variables
    var incidenceType = kit.getVariable('incidencia_type');
    var ciudad = kit.getVariable('ciudad')
  .toUpperCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, "")
  .replace(/\//g, "");// Limpiando de mayúsculas, tíldes y espacios
    console.log("ciudad: "+ ciudad);
    console.log("incidenceType: "+ incidenceType);

  

    // Creando el objeto de configuración de Axios para la solicitud POST
    const axiosConfig = {
      method: 'get',
      url: 'https://sheetdb.io/api/v1/xke35vgm6ijjl/search',
      headers: {
        'Content-Type': 'application/json'
      },
      params: {
        casesensitive: false,
        Incidencia: incidenceType
      },
    };

    // Realizando la solicitud POST y devolviendo los resultados
    try {
      const response = await axios(axiosConfig);
      console.log('Respuesta SheetDB001 Search:', JSON.stringify(response.data, null, 2));
      return { data: response.data, incidenceType: incidenceType, ciudad: ciudad  }; // Devuelve un objeto con los datos y el nombre de la columna
    } catch (error) {
      console.error('Error al realizar la solicitud HTTP POST:', error.message);
      return null;
    }
  }

  
//A continuación, vamos a crear una función para validar el código postal o el nombre de la población, según el dato que esté disponible. 

async function validateData(incidenceType, filterValue) {
  console.log("validateData(incidenceType, filterValue): " + incidenceType + filterValue);

  let filterType;

  // Verifica si filterValue contiene números
  const containsNumbers = /\d/.test(filterValue);

  if (containsNumbers) {
    filterType = 'cp';
  } else {
    filterType = 'Poblacion';
    filterValue = filterValue.toUpperCase();
  }

  // Aquí se devuelve filterType y filterValue en un objeto
  return { filterType, filterValue };
}

// Eligiendo la Sheet name en función de la incidenceType 
  //filterType puede ser cp o poblacion y filterValue puede ser codigo o nombre
  async function getDataFromSheetDB(incidenceType, filterType, filterValue) {
    console.log("inicia getDataFromSheetDB(incidenceType, filterType, filterValue);"+ incidenceType + filterType + filterValue);
  
    const sheet = incidenceType === 'Calderas' ? 'calderas' : 'ALL';
    const apiUrl = `https://sheetdb.io/api/v1/xke35vgm6ijjl/search?sheet=${sheet}&casesensitive=false&${filterType}=${filterValue}`;

    const fetch = await import('node-fetch');
    try {
      const response = await fetch.default(apiUrl);
      const data = await response.json();

      if (data.length > 0) {
        return data;
        console.log("Result getDataFromSheetDB:", JSON.stringify(data, null, 2));
        

      } else {
        throw new Error('No se encontraron coincidencias.');
      }
    } catch (error) {
      return error.message;
    }
  }

//Obtener el número según la Provincia (columnName) desde la respuesta de SheetDB (data)

function city_filter(data, response) {
  console.log("data value: " + JSON.stringify(data, null, 2));

  // Hacer columName ? a Region para seleccionar el número de Vitara o Gipuzkoa
  const columnName = data[0].Region;
  console.log("columnName: " + JSON.stringify(columnName, null, 2));
  const phone_number = response[0][columnName];
  console.log("phone_number: " + JSON.stringify(phone_number, null, 2));
  return { phone_number, columnName };
  
}
  
// Uso de la función
getDataByLocationAndType()
  .then(result => {
    validateData(result.incidenceType, result.ciudad)
      .then(validationResult => {
        // Aquí se obtienen filterType y filterValue del objeto devuelto por validateData
        const filterType = validationResult.filterType;
        const filterValue = validationResult.filterValue;

        getDataFromSheetDB(result.incidenceType, filterType, filterValue)
          .then(dataResult => {
            console.log("data value: " + JSON.stringify(dataResult, null, 2));
            console.log("result.data value: " + JSON.stringify(result.data, null, 2));
            filterResult = city_filter(dataResult, result.data);
                kit.setVariable('columnName', filterResult.columnName);
                kit.setVariable('phone_number_to_call', filterResult.phone_number);
                console.log("phone_number_to_call: " + filterResult.phone_number);
            callback(200, kit.getResponseBody());
          })
          .catch(error => console.error(error));
      })
      .catch(error => console.error(error));
  })
  .catch(error => console.error(error));

 

 
}


    
