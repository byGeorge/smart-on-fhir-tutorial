/********************************************************************************
* Handles the popup menus that appear when the "Edit Doctors" button is clicked.*
* Only MPagesAllAdmin and MPagesEditorsAdmin users may view the button.			* 
* Dependencies: Jquery, JQuery UI												*
* Author: George Roberts 6/11/2018												*
*********************************************************************************/
var EditDoctors = function(){
	// show Edit Doctors button only with Editors Admin or All Admin access
	$(window).on("Permission_Success", function(){
    	if (PermissionHandler.CanAccessMPage("Editors", "admin"))
    		$("#editdoctors").show();
    });
	// set up dialogs
	$("#edit_doctors_pid").dialog({
		modal: true,
		autoOpen: false,
		buttons:[
			{
				text: "Search",
				click: function(){
					EditDoctors.Search();
				}
			},
			{
				text: "Quit",
				click: function(){
					$("#edit_doctors_pid").dialog("close");
				}
			}
		]
	});
	$("#edit_doctors_entry").dialog({
		modal: true,
		autoOpen: false,
		buttons:[
			{
				text: "Send",
				click: function(){
					EditDoctors.Send();
				}
			},
			{
				text: "Quit",
				click: function(){
					$("#edit_doctors_pid").val("");
					$("#edit_doctors_entry").dialog("close");
				}
			}
		]
	});
	return {
		Init: function(){
			$("#edit_doctors_pid").dialog("open");
		},
		Display: function(raw_data){
			var data = JSON.parse(raw_data).RECORD_DATA;
			$("#edit_doctors_pid").dialog("close");
			$("#edit_doctors_entry").dialog("open");
			$("#ede_id").val(data.DOCTOR_ID);
			$("#ede_fname").val(data.FIRST_NAME);
			$("#ede_lname").val(data.LAST_NAME);
			$("#ede_npi").val(data.NPI);
			$("#ede_addr1").val(data.ADDR1);
			$("#ede_addr2").val(data.ADDR2);
			$("#ede_city").val(data.CITY);
			$("#ede_state").val(data.STATE);
			$("#ede_county").val(data.COUNTY);
			$("#ede_zip").val(data.ZIP);
			$("#ede_phone").val(data.PHONE);
		},
		// currently, search is by PERSON_ID
		Search: function(){
			DataHandler.GetPhysicianByOid($("#edit_doctor_id").val(), EditDoctors.Display);
		},
		// sends changes to data handler
		Send: function(){
			var data = {
				"PHYSICIAN_NPI":$("#ede_npi").val(),
				"PHYSICIAN_ZIP":$("#ede_zip").val(),
				"PHYSICIAN_STREET_ADDRESS_1":$("#ede_addr1").val(),
				"PHYSICIAN_STREET_ADDRESS_2":$("#ede_addr2").val(),
				"PHYSICIAN_CITY":$("#ede_city").val(),
				"PHYSICIAN_STATE":$("#ede_state").val(),
				"PHYSICIAN_COUNTY":$("#ede_county").val(),
				"PHYSICIAN_PHONE":$("#ede_phone").val(),
				"PHYSICIAN_ID":$("#ede_id").val()
			}; 
			DataHandler.SendDoctor(data);
			$("#edit_doctors_entry").dialog("close");
			alert("Physician data changed.");
		}
	};
}();
