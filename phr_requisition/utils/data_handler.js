var DataHandler = function () {
	var predata;
    var patient_data = {};
    var counties = [];
    var countries = [];
    var states = [];
    var all_employers = [];
    var phr_predata;
    var races = [];
    var sexes = [];
    var purposes = [];
    var ethnic_groups = [];
    var user_id = ""; // millennium's id number
    var arup_employee_number = "";
    var environment = "DEV";
    var selected_orders = [];
    var ap_prefixes;
	
    function UpdateAnsr(data){ 
    	var dt = new Date();
    	function addZero(num){
    		if (num < 10)
    			return "0" + num;
    		else 
    			return num;
    	} 
    	var today = dt.getFullYear ()+ "-" + addZero(dt.getMonth() + 1) + "-" + addZero(dt.getDate()) + " " 
    		+ addZero(dt.getHours()) + ":" + addZero(dt.getMinutes()) + ":" + addZero(dt.getSeconds());
    	var url = "http://10.101.148.9:32767/PostDoctor?date=" + dt;
    	if (environment.toUpperCase() !== "P11") {
    		url = "http://10.101.148.10:32767/PostDoctor?date=" + dt;
    	}
    	for (var i = 0; i < selected_orders.length; i++){
	    	var message = {
				"Environment": environment,
	    		"Encounter":patient_data.ENCOUNTER_ID,
				"Doctor_First_Name":patient_data.PHYSICIAN_FIRST_NAME,
	   			"Doctor_Last_Name":patient_data.PHYSICIAN_LAST_NAME,
	   			"Doctor_NPI":patient_data.PHYSICIAN_NPI,
				"Doctor_Address":data.PHYSICIAN_STREET_ADDRESS_1 + " " + data.PHYSICIAN_STREET_ADDRESS_2,
				"Doctor_City":data.PHYSICIAN_CITY,
				"Doctor_State":data.PHYSICIAN_STATE,
				"Doctor_Zip_Code":data.PHYSICIAN_ZIP,
				"Doctor_County":data.PHYSICIAN_COUNTY,
				"Testing_Purpose":data.PURPOSE,
				"Doctor_Phone":data.PHYSICIAN_PHONE,
				"Last_Update_when":today,
				"Accession":patient_data.ACCESSION.replace(/-/g,""),
				"Order_Number":patient_data.ORDERS[i].TEST_ALIAS,
				"Order_Differentiator":patient_data.ORDERS[i].ORDER_ID
	    	}; 
	    	var req = new XMLHttpRequest();
	    	req.open("POST", url, true); 
	    	req.setRequestHeader("Cache-Control", "no-cache");
	    	var origin = url.replace("?date=" + dt, "");
	    	req.setRequestHeader("Access-Control-Allow-Origin", origin);
	        req.send(JSON.stringify(message));
        }
    }
    function CreateHL7Message(data){
		try{
			var url; 
        	if (environment.toUpperCase() === "DEV")
        		return;
			else if(environment.toUpperCase() !== "P11") { // any nonprod
				url = "http://10.101.148.10:32767/SendHL7Message";
			}
			else { //PROD
				url = "http://10.101.148.9:32767/SendHL7Message";
			}
	        var segments = [];
	        var dt = Date.now();
	        var date = new Date(dt);
	        var date_arr = [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()]; 
	        for (var i = 1; i < date_arr.length; i++){
	        	if (date_arr[i] < 10)
	        		date_arr[i] = "0" + date_arr[i];
	        }
	        var dob_str = "";
	        try{
		       	var dob_arr = data.PATIENT_BIRTH_DATE.split('/'); // month/day/year
		       	if (dob_arr.length === 3)
		       		dob_str = dob_arr[2] + dob_arr[0] + dob_arr[1]; // yearmonthday
		       	
		    }
		    catch(e){ dob_str = ""; } // no birth date entered
	        var race_alias = "";
	        for (var i = 0; i < predata.RACES.length; i++) {
	        	if (data.RACE === predata.RACES[i].RACE)
	        		race_alias = predata.RACES[i].RACE_ALIAS;
	        }
	        var ethnic_alias = "";
	        for (var i = 0; i < predata.ETHNIC_GROUPS.length; i++) {
	        	if (data.ETHNIC_GROUP === predata.ETHNIC_GROUPS[i].ETHNIC_GROUP)
	        		ethnic_alias = predata.ETHNIC_GROUPS[i].ETHNIC_GROUP_ALIAS;
	        } 
	        var pt_addr = [data.PATIENT_STREET_ADDRESS_1, data.PATIENT_STREET_ADDRESS_2, data.PATIENT_CITY, data.PATIENT_STATE, data.PATIENT_ZIP, data.PATIENT_COUNTY].join("^");
	        if (data.PATIENT_STREET_ADDRESS_1 === undefined){
	        	pt_addr = "";
	        } 
	        var empl_addr = [
	        	data.EMPLOYER_STREET_ADDRESS_1, 
	        	data.EMPLOYER_STREET_ADDRESS_2, 
	        	data.EMPLOYER_CITY, 
	        	data.EMPLOYER_STATE, 
	        	data.EMPLOYER_ZIP, 
	        	data.EMPLOYER_COUNTRY, // country
	        	"", // addr3
	        	"", // address type
	        	data.EMPLOYER_COUNTY];
	        if (data.EMPLOYER_STREET_ADDRESS_1 === undefined)
	        	empl_addr = [];
	        var alias = patient_data.CLIENT_ALIAS;
	        if (alias === "")
	        	alias = "ESP";
	        segments.push("MSH|^~\\&|" + alias + "|" + patient_data.CLIENT_NAME + "|ARUP|138|" + date_arr.join('') + "|" 
	        	+ environment.toUpperCase() + "|ADT^A08|" + date_arr.join('') + "|T|2.3");
	        segments.push("EVN|A08|" + date_arr.join('') + "|||" + arup_employee_number);
	        segments.push("PID|1||" + patient_data.MRN + "||" + patient_data.PATIENT_LAST_NAME + 
		       	"^" + patient_data.PATIENT_FIRST_NAME + "||" + dob_str + "|" 
		       	+ "||" + race_alias + "|" + pt_addr + "||" + data.PATIENT_PHONE + "|||||" + patient_data.FIN + "||||" 
		       	+ ethnic_alias + "|");
			segments.push("ZEI|1||" + data.EMPLOYER_NAME + "|" + empl_addr.join("^") + "|" + 
				data.EMPLOYER_PHONE + "|" + data.EMPLOYER_CONTACT + "||" + data.OCCUPATION + 
				"|||" + patient_data.EMPLOYER_ALIAS + "^" + data.EMPLOYER_NAME);
		    if (data.GUARDIAN_LAST_NAME !== patient_data.GUARDIAN_LAST_NAME || data.GUARDIAN_FIRST_NAME !== patient_data.GUARDIAN_FIRST_NAME)
			       	segments.push("NK1|1|" + data.GUARDIAN_LAST_NAME + "^" + data.GUARDIAN_FIRST_NAME + "|||||GUARDIAN");
		       	segments.push("PV1|1|O|ARUPU^^^ARUP^^^ARUPB|||||||||||||||G|"+ patient_data.FIN + "|||||||||||||||||||||||||||||||" + patient_data.MRN);
	       	var xmlHttp = new XMLHttpRequest();
		   	xmlHttp.onreadystatechange = function () { 
	    	    if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
	            	alert("Changes saved!\n If this patient is open in another application or window, please refresh to view changes.");
	        	}
	            else if (xmlHttp.readyState === 4) {
	                alert("Error sending HL7 message: " + xmlHttp.status);
				}
			};
			xmlHttp.open("POST", url, true);
			xmlHttp.send(segments.join('\r') + "\r");
		}
	   	catch(e){alert("Error creating HL7 message: " + e.message);}
    }
	
    function FHIRready(data){
	    DataHandler.CCLRequest("1_arup_mp_get_environment", ["^MINE^"], true, DataHandler.SetUserID);
            DataHandler.CCLRequest("1_arup_mp_get_ap_prefixes",["^MINE^"], true, DataHandler.SetAPPrefixes);
    }
	
    function FHIRerror(){
	    alert("error: " + arguments);
    }
	
		    var scope = 'patient/Patient.read patient/Observation.read patient/Encounter.read patient/RelatedPerson.read'
				+ ' launch online_access openid profile'
		    FHIR.oauth2.authorize({
			'client_id': 'a1e86744-7b2c-447b-b97b-6687a4b8b390',
			'scope':  scope
		    });

    return {
        Init: function () {
	    alert(window.location.href);
            WaitScreen.Start("Setting up page");
//	    var idx = (window.location.href).indexOf("&error=");
//	    if (idx >= 0)
//		    alert("Error Loading Page");
//	    else
//		    idx = (window.location.href).indexOf("&code=")
//	    if (idx < 0) {
		FHIR.oath2.ready(FHIRready, FHIRerror);
//	    }
        },
        CCLRequest: function (program_name, params, async, call_back) { 
            var req;
            var log;
            var d_start = new Date();
            try {
                alert(program_name);
            }
            catch (e) {
                alert("Error connecting to Millennium: " + e.message);
            }
	    call_back(null);
        },
        ClearPatient: function(){
        	patient_data = {};
        	selected_orders = [];
        },
        GetAccession: function(){
        	try{
        		return patient_data.ACCESSION;
        	}
        	catch(e){
        		return "No accession selected";
        	}
        },
        GetAPRegex: function(){
        	return ap_prefixes;
        },
        GetArupId: function(){
        	return arup_employee_number;
        },
        GetClientId: function(){
        	var id = patient_data.CLIENT_ID;
        	try {
        		if (id > 0)
	        		return id;
	        	else 
	        		return 0;
        	}
        	catch(e){
        		return 0;
        	}
        },
        GetClientName: function(){
            try {
        		return patient_data.CLIENT_NAME;
        	}
        	catch(e){
        		return "";
        	}
        },
        GetCounties: function () {
            return counties;
        },
        GetCountries: function() {
        	return countries;
        },
        GetEmployerData: function (name, alias, zipcode, call_back) {           
			var args = ["^MINE^", "^" + name + "^", "^" + alias + "^", "^" + zipcode + "^"];
			DataHandler.CCLRequest("1_arup_mp_get_employers", args, true, call_back);
        },
        GetEmployerExists: function(name, call_back){
        	DataHandler.CCLRequest("1_arup_mp_existing_emp", ["^MINE^", "^" + name + "^"], true, call_back);
        },
        GetEthnicGroups: function () {
            return ethnic_groups;
        },
        GetLocationsByZip: function (zip, call_back) {
            WaitScreen.Start("Getting zip code data");
            DataHandler.CCLRequest("1_arup_mp_get_zip_info", ["^MINE^", "^" + zip + "^"], true, call_back);
        },
        GetPatientData: function () { 
            return patient_data;
        },
        GetPatientBySearch: function(fname, lname, acc, start_date, end_date, call_back) {
            WaitScreen.Start("Searching for patients");
            var toReturn;
			var params = ["^MINE^", 
				"^" + fname + "^", 
				"^" + lname + "^", 
				"^" + acc + "^", 
				"^" + start_date.replace('/','') + "^",
				"^" + end_date.replace('/', '') + "^"]; 
			DataHandler.CCLRequest("1_arup_mp_get_pat_by_search", params, true, call_back);
			WaitScreen.Stop("Searching for patients");
        },
        GetPatient: function(){
            return patient_data;
        },
        GetPatientByOID: function(order_ids){
            WaitScreen.Start("Getting patient data from Millennium");
            selected_orders = order_ids;
            if (order_ids.length > 0) {
                DataHandler.CCLRequest("1_arup_mp_get_patient_by_oid", ["^MINE^", order_ids[0]], true, DataHandler.SetPatientData);
            }
            else
            	WaitScreen.Stop("Getting patient data from Millennium");
        },
        GetPatientFromEditorsPage: function(order_id){
			DataHandler.CCLRequest("1_arup_mp_get_patient_by_oid", ["^MINE^", order_id], true, PHRSearch.InsertFromEditorsPage);
        },
        GetPhyPrevAddrs: function(call_back){
        	DataHandler.CCLRequest("1_arup_mp_get_phy_prev_addrs", ["^MINE^", patient_data.PHYSICIAN_ID], true, call_back);
        },
        GetPhysicianByOid: function(oid, call_back){
        	DataHandler.CCLRequest("1_arup_mp_get_doc_by_id", ["^MINE^", oid], true, call_back);
        },
        GetPreferences: function (call_back) {  
			DataHandler.CCLRequest("1_arup_mp_get_preferences", ["^MINE^", user_id, "^" + mpage_name + "^"], true, call_back);
			WaitScreen.Stop("Getting preferences");
        },
        GetPurpose: function () {
            return purposes;
        },
        GetRaces: function () {
            return races;
        },
        GetRequiredFields: function (state, call_back) {
            if (state !== "") {
	            var req_url = "http://10.101.148.9:32767/phrGetReqDemographics?Environment=" + environment + "&State=" + state + "&ReturnType=JSON";
	            var orders = [];
	            for (var i = 0; i < patient_data.ORDERS_SIZE; i++)
	            	orders.push(patient_data.ORDERS[i].TEST_CD);
	            if (environment !== "P11")
	            	req_url = "http://10.101.148.10:32767/phrGetReqDemographics?Environment=" + environment + "&State=" + state + 
	            		"&Test=" + orders.join(',') + "&ReturnType=JSON"; 
	            var req = new XMLHttpRequest(); 
	            req.onreadystatechange = function(){
	            	if (req.readyState === 4 && req.status === 200){
	            		try{
	            			var data = JSON.parse(req.responseText).Required_Demographics.phrReqDemographics;
	            			var toReturn; 
	            			if (data.length >= 1){
	        					var toReturn = {
	        						"PATIENT_LAST_NAME": false, 
									"PATIENT_FIRST_NAME": false, 
									"PATIENT_MIDDLE_NAME": false, 
									"PATIENT_SEX": false,
									"MRN": false,
									"PATIENT_BIRTH_DATE": false,
									"RACE": false, 
									"ETHNIC_GROUP": false, 
									"PATIENT_ZIP": false, 
									"PATIENT_ZIP_PROVIDED": false,
									"PATIENT_STREET_ADDRESS_1": false, 
									"PATIENT_STREET_ADDRESS_2": false, 
									"PATIENT_CITY": false,
									"PATIENT_STATE": false, 
									"PATIENT_COUNTY": false, 
									"PATIENT_PHONE": false, 
									"GUARDIAN_LAST_NAME": false,
									"GUARDIAN_FIRST_NAME": false, 
									"GUARDIAN_NAME_CONDITION": "",							
									"EMPLOYER_NAME": false, 
									"OCCUPATION": false,
									"EMPLOYER_STREET_ADDRESS_1": false, 
									"EMPLOYER_STREET_ADDRESS_2": false, 
									"EMPLOYER_CITY": false,
									"EMPLOYER_STATE": false, 
									"EMPLOYER_ZIP": false, 
									"EMPLOYER_ZIP_PROVIDED": false, 
									"EMPLOYER_PHONE": false,
									"OCCUPATION_CONDITION": "",
									"EMPLOYER_ADDRESS_CONDITION": "",
									"EMPLOYER_CONDITION": "",
									"PHYSICIAN_LAST_NAME": false, 
									"PHYSICIAN_FIRST_NAME": false, 
									"PHYSICIAN_NPI_LEAD": false,
									"PHYSICIAN_STREET_ADDRESS_1": false, 
									"PHYSICIAN_CITY": false,
									"PHYSICIAN_STATE": false, 
									"PHYSICIAN_COUNTY": false, 
									"PHYSICIAN_ZIP": false, 
									"PHYSICIAN_ZIP_PROVIDED": false,
									"PHYSICIAN_PHONE": false, 
									"PHYSICIAN_ADDRESS_CONDITION": "",
									"PHYSICIAN_PHONE_CONDITION": "",
									"PURPOSE": false, 
									"ORDER_ID": false
								};
	        					for (var i = 0; i < data.length; i++){
	        						if (data[i].PatientName === 1){
	        							toReturn.PATIENT_LAST_NAME = true; 
										toReturn.PATIENT_FIRST_NAME = true;
	        						}
	        						if (data[i].PatientGender === 1)
	        							toReturn.PATIENT_SEX = true;
	        						if (data[i].PatientDateOfBirth === 1)
	        							toReturn.PATIENT_BIRTH_DATE = true;
	        						if (data[i].PatientRace === 1)
	        							toReturn.RACE = true;
	        						if (data[i].PatientEthnicity === 1)
	        							toReturn.ETHNIC_GROUP = true;
	        						if (data[i].PatientAddressZipCode === 1)
	        							toReturn.PATIENT_ZIP = true;
	        						if (data[i].PatientAddress1 === 1)
	        							toReturn.PATIENT_STREET_ADDRESS_1 = true;
	        						if (data[i].PatientAddress2 === 1)
	        							toReturn.PATIENT_STREET_ADDRESS_2 = true;
	        						if (data[i].PatientAddressCity === 1)
	        							toReturn.PATIENT_CITY = true;
	        						if (data[i].PatientAddressState === 1)
	        							toReturn.PATIENT_STATE = true;
	        						if (data[i].PatientAddressCounty === 1)
	        							toReturn.PATIENT_COUNTY = true;
	        						if (data[i].PatientPhone === 1)
	        							toReturn.PATIENT_PHONE = true;
	        						if (data[i].PatientGuardianName === 1){
	        							toReturn.GUARDIAN_LAST_NAME = true;
	        							toReturn.GUARDIAN_FIRST_NAME = true;
	        						}
	        						toReturn.GUARDIAN_NAME_CONDITION += "," + data[i].PatientGuardianNameCondition;
	        						if (data[i].PatientEmployer === 1)
	        							toReturn.EMPLOYER_NAME = true;
	        						if (data[i].PatientOccupation === 1)
	        							toReturn.OCCUPATION = true;
	        						toReturn.OCCUPATION_CONDITION += "," + data[i].PatientOccupationCondition;
	        						toReturn.EMPLOYER_ADDRESS_CONDITION += "," + data[i].PatientEmployerAddressCondition;
	        						toReturn.EMPLOYER_CONDITION += "," + data[i].PatientEmployerCondition;
	        						if (data[i].PhysicianName === 1) {
	        							toReturn.PHYSICIAN_LAST_NAME = true;
	        							toReturn.PHYSICIAN_FIRST_NAME = true;
	        						}
	        						if (data[i].NPI === 1)
	        							toReturn.PHYSICIAN_NPI_LEAD = true;
	        						if (data[i].PhysicianAddressLine1 === 1)
	        							toReturn.PHYSICIAN_STREET_ADDRESS_1 = true;
									if (data[i].PhysicianAddressCity === 1)
	        							toReturn.PHYSICIAN_CITY = true;
	        						if (data[i].PhysicianAddressState === 1)
	        							toReturn.PHYSICIAN_STATE = true;
	        						if (data[i].PhysicianAddressCounty === 1)
	        							toReturn.PHYSICIAN_COUNTY = true;
	        						if (data[i].PhysicianAddressZipCode === 1)
	        							toReturn.PHYSICIAN_ZIP = true;
	        						if (data[i].PhysicianPhone === 1)
	        							toReturn.PHYSICIAN_PHONE = true;
									toReturn.PHYSICIAN_ADDRESS_CONDITION += "," + data[i].PhysicianAddressCondition;
									toReturn.PHYSICIAN_PHONE_CONDITION += "," + data[i].PhysicianPhoneCondition;
	        					}
	            			}
	            			else {
	            				toReturn = {
									"PATIENT_LAST_NAME": data.PatientName === 1, 
									"PATIENT_FIRST_NAME": data.PatientName === 1, 
									"PATIENT_MIDDLE_NAME": false, 
									"PATIENT_SEX": data.PatientGender === 1,
									"MRN": false,
									"PATIENT_BIRTH_DATE": data.PatientDateOfBirth === 1,
									"RACE": data.PatientRace === 1, 
									"ETHNIC_GROUP": data.PatientEthnicity === 1, 
									"PATIENT_ZIP": data.PatientAddressZipCode === 1, 
									"PATIENT_ZIP_PROVIDED": false,
									"PATIENT_STREET_ADDRESS_1": data.PatientAddress1 === 1, 
									"PATIENT_STREET_ADDRESS_2": false, 
									"PATIENT_CITY": data.PatientAddressCity === 1,
									"PATIENT_STATE": data.PatientAddressState === 1, 
									"PATIENT_COUNTY": data.PatientAddressCounty === 1, 
									"PATIENT_PHONE": data.PatientPhone === 1, 
									"GUARDIAN_LAST_NAME": data.PatientGuardianName === 1,
									"GUARDIAN_FIRST_NAME": data.PatientGuardianName === 1, 
									"GUARDIAN_NAME_CONDITION": data.PatientGuardianNameCondition,							
									"EMPLOYER_NAME": data.PatientEmployer === 1, 
									"OCCUPATION": data.PatientOccupation === 1,
									"OCCUPATION_CONDITION": data.PatientOccupationCondition,
									"EMPLOYER_CONDITION": data.PatientEmployerCondition,
									"EMPLOYER_STREET_ADDRESS_1": data.PatientEmployerAddress === 1, 
									"EMPLOYER_STREET_ADDRESS_2": false, 
									"EMPLOYER_CITY": false,
									"EMPLOYER_STATE": false, 
									"EMPLOYER_ZIP": false, 
									"EMPLOYER_ZIP_PROVIDED": false, 
									"EMPLOYER_PHONE": data.PatientEmployerPhone === 1,
									"EMPLOYER_ADDRESS_CONDITION": data.PatientEmployerAddressCondition,
									"PHYSICIAN_LAST_NAME": data.PhysicianName === 1, 
									"PHYSICIAN_FIRST_NAME": data.PhysicianName === 1, 
									"PHYSICIAN_NPI_LEAD": data.NPI === 1,
									"PHYSICIAN_STREET_ADDRESS_1": data.PhysicianAddressLine1 === 1, 
									"PHYSICIAN_CITY": data.PhysicianAddressCity === 1,
									"PHYSICIAN_STATE": data.PhysicianAddressState === 1, 
									"PHYSICIAN_COUNTY": data.PhysicianAddressCounty === 1, 
									"PHYSICIAN_ZIP": data.PhysicianAddressZipCode === 1, 
									"PHYSICIAN_ZIP_PROVIDED": false,
									"PHYSICIAN_PHONE": data.PhysicianPhone === 1, 
									"PHYSICIAN_ADDRESS_CONDITION": data.PhysicianAddressCondition,
									"PHYSICIAN_PHONE_CONDITION": data.PhysicianPhoneCondition,
									"PURPOSE": false, 
									"ORDER_ID": false
								}; 
							}
							if (call_back)
								call_back(toReturn);
	            			return toReturn;
						}
						catch(e){}
	            	}
	            	else if (req.readyState === 4) {
					if (call_back)
						call_back({
							"PATIENT_LAST_NAME": false, 
							"PATIENT_FIRST_NAME": false, 
							"PATIENT_MIDDLE_NAME": false, 
							"PATIENT_SEX": false,
							"MRN": false,
							"PATIENT_BIRTH_DATE": false,
							"RACE": false, 
							"ETHNIC_GROUP": false, 
							"PATIENT_ZIP": false, 
							"PATIENT_ZIP_PROVIDED": false,
							"PATIENT_STREET_ADDRESS_1": false, 
							"PATIENT_STREET_ADDRESS_2": false, 
							"PATIENT_CITY": false,
							"PATIENT_STATE": false, 
							"PATIENT_COUNTY": false, 
							"PATIENT_PHONE": false, 
							"GUARDIAN_LAST_NAME": false,
							"GUARDIAN_FIRST_NAME": false, 
							"GUARDIAN_NAME_CONDITION": "",							
							"EMPLOYER_NAME": false, 
							"OCCUPATION": false,
							"EMPLOYER_STREET_ADDRESS_1": false, 
							"EMPLOYER_STREET_ADDRESS_2": false, 
							"EMPLOYER_CITY": false,
							"EMPLOYER_STATE": false, 
							"EMPLOYER_ZIP": false, 
							"EMPLOYER_ZIP_PROVIDED": false, 
							"EMPLOYER_PHONE": false,
							"OCCUPATION_CONDITION": "",
							"EMPLOYER_ADDRESS_CONDITION": "",
							"EMPLOYER_CONDITION": "",
							"PHYSICIAN_LAST_NAME": false, 
							"PHYSICIAN_FIRST_NAME": false, 
							"PHYSICIAN_NPI_LEAD": false,
							"PHYSICIAN_STREET_ADDRESS_1": false, 
							"PHYSICIAN_CITY": false,
							"PHYSICIAN_STATE": false, 
							"PHYSICIAN_COUNTY": false, 
							"PHYSICIAN_ZIP": false, 
							"PHYSICIAN_ZIP_PROVIDED": false,
							"PHYSICIAN_PHONE": false, 
							"PHYSICIAN_ADDRESS_CONDITION": "",
							"PHYSICIAN_PHONE_CONDITION": "",
							"PURPOSE": false, 
							"ORDER_ID": false
						});
	            	}
	            };
	            req.open("GET", req_url, true);
	            req.send("");
			}
        },
        GetSelectedOrders: function() {
        	return selected_orders();
        },
        GetSexes: function () {
            return sexes;
        },
        GetStates: function () {
            return states;
        },
        GetUserID: function(){ 
            return user_id;
        },
        SendDoctor: function(data, call_back){ 
       		if (data.PHYSICIAN_NPI !== patient_data.PHYSICIAN_NPI || data.PHYSICIAN_ZIP !== patient_data.PHYSICIAN_ZIP ||
        			data.PHYSICIAN_STREET_ADDRESS_1 !== patient_data.PHYSICIAN_STREET_ADDRESS_1 ||
        			data.PHYSICIAN_STREET_ADDRESS_2 !== patient_data.PHYSICIAN_STREET_ADDRESS_2 ||
        			data.PHYSICIAN_CITY !== patient_data.PHYSICIAN_CITY || data.PHYSICIAN_STATE !== patient_data.PHYSICIAN_STATE ||
        			data.PHYSICIAN_COUNTY !== patient_data.PHYSICIAN_COUNTY || data.PHYSICIAN_PHONE !== patient_data.PHYSICIAN_PHONE) {
	        	var p_args = [
	        		"^MINE^",
	        		"^" + data.PHYSICIAN_NPI + "^",
					"^" + data.PHYSICIAN_ZIP + "^",
					"^" + data.PHYSICIAN_STREET_ADDRESS_1 + "^",
					"^" + data.PHYSICIAN_STREET_ADDRESS_2 + "^",
					"^" + data.PHYSICIAN_CITY + "^",
					"^" + data.PHYSICIAN_STATE + "^",
					"^" + data.PHYSICIAN_COUNTY + "^",
					"^" + data.PHYSICIAN_PHONE + "^",
					patient_data.PHYSICIAN_ID,
					"^" + arup_employee_number + "^"
	        	];
	        	DataHandler.CCLRequest("1_arup_mp_add_doctor", p_args, true, call_back);
	        }
        },
        SendOrderData: function (data, call_back) {
        	try{
	        	DataHandler.SendDoctor(data);
		        for (var i = 0; i < patient_data.ORDERS_SIZE; i++){
	        		var pur_args = ["^MINE^", patient_data.ORDERS[i].ORDER_ID + ".00", "^" + data.PURPOSE + "^"];
	        		DataHandler.CCLRequest("1_arup_mp_add_purpose", pur_args, true, call_back);
		        }
		        CreateHL7Message(data);
		        UpdateAnsr(data);
        	}
        	catch(e){
        		alert("We encountered an error while trying to make this update: " + e.message);
        	}
        	if (call_back)
        		call_back();
        },
        SendPreferences: function (pref_string) {
			var j_objbot = {};
			j_objbot["Components"] = JSON.parse(pref_string);
			var j_objmid = {};
			j_objmid["PagePrefs"] = j_objbot;
			var j_objtop = {};
			j_objtop["UserPrefs"] = j_objmid;
			var send_string = JSON.stringify(j_objtop);
			var args = ["^MINE^", user_id + ".0","^" + mpage_name + "^", "^" + pref_string + "^"]; 
			DataHandler.CCLRequest("MP_MAINTAIN_USER_PREFS", args, true);
        },
        SetAPPrefixes: function(regex){
        	ap_prefixes = new RegExp(regex);
        },
        SetEmployer: function(emp){
      		patient_data.EMPLOYER_ID = emp.ID;
      		patient_data.EMPLOYER_NAME = emp.NAME;
      		patient_data.EMPLOYER_ALIAS = emp.ALIAS;
      		patient_data.EMPLOYER_STREET_ADDRESS_1 = emp.ADDR1;
      		patient_data.EMPLOYER_STREET_ADDRESS_2 = emp.ADDR2;
      		patient_data.EMPLOYER_CITY = emp.CITY;
      		patient_data.EMPLOYER_STATE = emp.STATE;
      		patient_data.EMPLOYER_ZIP = emp.ZIP;
      		patient_data.EMPLOYER_PHONE = emp.PHONE;
      		patient_data.NEW_EMPLOYER = true;
        },
        SetPatientData: function(data) {  
            var new_data = JSON.parse(data).RECORD_DATA;
            if (new_data.ORDERS_SIZE === 0)
	            selected_orders = [];
            patient_data = {
            	"ACCESSION":new_data.ACCESSION,
            	"PATIENT_ID":new_data.PATIENT_ID,
                "PATIENT_LAST_NAME":new_data.PATIENT_LAST_NAME,
                "PATIENT_FIRST_NAME":new_data.PATIENT_FIRST_NAME,
                "PATIENT_MIDDLE_NAME":new_data.PATIENT_MIDDLE_NAME,
                "PATIENT_SEX":new_data.SEX.replace("Sex is ", ""),
               	"CLIENT_STATE":new_data.CLIENT_STATE,
               	"CLIENT_NAME":new_data.CLIENT_NAME,
               	"CLIENT_ID":new_data.CLIENT_ID,
               	"CLIENT_ALIAS":new_data.CLIENT_ALIAS,
               	"FIN":new_data.FIN,
                "MRN":new_data.MRN,
                "PATIENT_BIRTH_DATE":new_data.DOB,
                "RACE":new_data.RACE,
                "ETHNIC_GROUP":new_data.ETHNIC_GROUP,
                "PATIENT_ZIP":new_data.PATIENT_ZIP,
                "PATIENT_STREET_ADDRESS_1":new_data.PATIENT_ADDR1,
                "PATIENT_STREET_ADDRESS_2":new_data.PATIENT_ADDR2,
                "PATIENT_CITY":new_data.PATIENT_CITY,
                "PATIENT_STATE":new_data.PATIENT_STATE,
                "PATIENT_COUNTY":new_data.PATIENT_COUNTY,
                "PATIENT_PHONE":new_data.PATIENT_PHONE,
                "GUARDIAN_LAST_NAME":new_data.GUARDIAN_LAST_NAME,
                "GUARDIAN_FIRST_NAME":new_data.GUARDIAN_FIRST_NAME,
                "EMPLOYER_ID":new_data.EMPLOYER_ID,
                "EMPLOYER_NAME":new_data.EMPLOYER_NAME,
                "EMPLOYER_ALIAS":new_data.EMPLOYER_ALIAS,
                "EMPLOYER_STREET_ADDRESS_1":new_data.EMPLOYER_ADDR1,
                "EMPLOYER_STREET_ADDRESS_2":new_data.EMPLOYER_ADDR2,
                "EMPLOYER_CITY":new_data.EMPLOYER_CITY,
                "EMPLOYER_STATE":new_data.EMPLOYER_STATE,
                "EMPLOYER_ZIP":new_data.EMPLOYER_ZIP,
                "EMPLOYER_PHONE":new_data.EMPLOYER_PHONE,
                "OCCUPATION":new_data.OCCUPATION,
                "NEW_EMPLOYER":false,
                "ENCOUNTER_ID":new_data.ENCOUNTER_ID,
                "ACCESSION":new_data.ACCESSION,
                "PHYSICIAN_LAST_NAME":new_data.PHYSICIAN_LAST_NAME,
                "PHYSICIAN_FIRST_NAME":new_data.PHYSICIAN_FIRST_NAME,
                "PHYSICIAN_ID":new_data.PHYSICIAN_ID,
                "PHYSICIAN_ZIP":new_data.PHYSICIAN_ZIP,
                "PHYSICIAN_STREET_ADDRESS_1":new_data.PHYSICIAN_ADDR1,
                "PHYSICIAN_STREET_ADDRESS_2":new_data.PHYSICIAN_ADDR2,
                "PHYSICIAN_CITY":new_data.PHYSICIAN_CITY,
                "PHYSICIAN_STATE":new_data.PHYSICIAN_STATE,
                "PHYSICIAN_COUNTY":new_data.PHYSICIAN_COUNTY,
                "PHYSICIAN_PHONE":new_data.PHYSICIAN_PHONE,
                "PURPOSE":new_data.PURPOSE
            }; 
            var orders = []; 
            var order_size = 0; 
            for (var i = 0; i < new_data.ORDERS_SIZE; i++) { 
            	if (selected_orders.indexOf(new_data.ORDERS[i].ORDER_ID.toString()) >= 0) { 
            		orders.push(new_data.ORDERS[i]);
            		order_size++;
            	}
            }
            patient_data.PHYSICIAN_NPI = orders[0].PHYSICIAN_ID;
            patient_data["ORDERS"] = orders;
            patient_data["ORDERS_SIZE"] = order_size;
            WaitScreen.Stop("Getting patient data from Millennium");
            PHRController.InsertData();
        },
        SetUserID: function(data){ 
            try { 
            	var j_data = JSON.parse(data);
            	arup_employee_number = j_data.ENVIRONMENT.USER_ID;
                user_id = j_data.ENVIRONMENT.USER_PRSNL_ID;
                environment = j_data.ENVIRONMENT.SERVER; 
                DataHandler.CCLRequest("1_arup_mp_get_phr_predata", ["^MINE^"], true, DataHandler.UsePredata);
            }
            catch(e) { 
                user_id = "";
            }
        },
        UsePredata: function (data) { 
            try {
                var json_data = JSON.parse(data);
                phr_predata = json_data.RECORD_DATA;
                
                for (var i = 0; i < phr_predata.ETHNIC_GROUP_SIZE; i++) 
                    ethnic_groups.push(phr_predata.ETHNIC_GROUPS[i].ETHNIC_GROUP);
                    
                for (var i = 0; i < phr_predata.PURPOSE_SIZE; i++)
                    purposes.push(phr_predata.PURPOSES[i].PURPOSE);
                                
                for (var i = 0; i < phr_predata.RACES_SIZE; i++)
                    races.push(phr_predata.RACES[i].RACE);
                
                for (var i = 0; i < phr_predata.SEX_SIZE; i++) 
                    sexes.push(phr_predata.SEXES[i].SEX.replace("Sex is ", ""));
                    
                for (var i = 0; i < phr_predata.STATE_SIZE; i++)
                	states.push(phr_predata.STATES[i].STATE);
                
                for (var i = 0; i < phr_predata.COUNTY_SIZE; i++)
                	counties.push(phr_predata.COUNTIES[i].COUNTY);
                	
                for (var i = 0; i < phr_predata.COUNTRY_SIZE; i++)
                	countries.push(phr_predata.COUNTRIES[i].COUNTRY);
                	
                predata = phr_predata;
                PHRController.InitializePage();
            }
            catch (e) {
                alert("Error initialising page: " + e.message);
            }
        },
        ValidateNPI: function(NPI_in){

			var worknpi = NPI_in;
			var npicalc = "";
			
 			if((worknpi != null) && (worknpi.length == 10)) {
            	npicalc = worknpi.substring(0,9);//will hold re-calculated NPI when done
              	worknpi = "80840"+worknpi.substring(0,9);//80=Health Applications
                                                          //840= United States 
                var npiary = worknpi.split('');//split into array for easy looping through characters
                var checksumstring = "";//hold raw numbers to be added together for validate checksum digit
                for(var i = npiary.length-1; i >= 2; i= i-2) {//*2 every other digit starting from rightmost character
					checksumstring = (parseInt(npiary[i]) * 2) + checksumstring;
                }
                for( i = npiary.length-2; i >= 0; i= i-2) {//just copy digits not used in above loop
					 checksumstring = npiary[i] + checksumstring;
                }
                var checksumary = checksumstring.split('');
                var checksum = 0;
                for(i = 0; i < checksumary.length; i++) {//add every digit together
					checksum = checksum + parseInt(checksumary[i]);
                }
                var subc = Math.floor(checksum/10);
                if(subc > 0) {
					subc = (subc+1)*10;
                }//round checksum up to nearest 10, and subtract checksum from that number for correct digit
                checksum = subc-checksum;
                npicalc = npicalc+checksum;
			}
			return (NPI_in == npicalc);//return true of false if the original number is valid
        }
    };
}();
