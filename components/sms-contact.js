export var template = `<!-- <div class='smscontact' id="smscontact">
		
		<div class='smscontactnameandphone'>
				<div class='smscontactpicture' id="smscontactpicture"><img src=""/></div>
				<div class='smscontactname' id="smscontactname">CONTACT_NAME</div>
				<div class='smscontactcall' id="smscontactcall"><img src="icons/call.png" /></div>
		</div>
		<div class='smstextanddate'>
				<div class='smscontacttext' id="smscontacttext">CONTACT_TEXT</div>
				<div class='smscontactdate' id="smscontactdate">CONTACT_DATE</div>
		</div>
</div> -->

<div class='smscontact' id="smscontact">

		<div class='smscontactpicture' id="smscontactpicture">
			<img src=""/>
			<svg width="256" height="256" viewBox="-10 -12 283 283" xmlns="http://www.w3.org/2000/svg">
			  <path d="M 130 222.16 C 98 222.16 69.712 205.776 53.2 181.2 C 53.584 155.6 104.4 141.52 130 141.52 C 155.6 141.52 206.416 155.6 206.8 181.2 C 190.288 205.776 162 222.16 130 222.16 M 130 40.4 C 151.208 40.4 168.4 57.59 168.4 78.8 C 168.4 100.01 151.208 117.2 130 117.2 C 108.792 117.2 91.6 100.01 91.6 78.8 C 91.6 57.59 108.792 40.4 130 40.4 M 130 2 C 59.308 2 2 59.306 2 130 C 2 200.694 59.308 258 130 258 C 200.692 258 258 200.694 258 130 C 258 59.216 200.4 2 130 2 Z"/>
			</svg>
		</div>
		<div class='smscontactnameandtext'>
				<div class='smscontactname' id="smscontactname">CONTACT_NAME</div>
				<div class='smscontacttext' id="smscontacttext">CONTACT_TEXT</div>
		</div>
		<div class='smscontactcallanddate'>
				<div class='smscontactcall' id="smscontactcall">
					<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="24" height="24" viewBox="0 0 24 24">
						<path d="M15,12H17A5,5 0 0,0 12,7V9A3,3 0 0,1 15,12M19,12H21C21,7 16.97,3 12,3V5C15.86,5 19,8.13 19,12M20,15.5C18.75,15.5 17.55,15.3 16.43,14.93C16.08,14.82 15.69,14.9 15.41,15.18L13.21,17.38C10.38,15.94 8.06,13.62 6.62,10.79L8.82,8.59C9.1,8.31 9.18,7.92 9.07,7.57C8.7,6.45 8.5,5.25 8.5,4A1,1 0 0,0 7.5,3H4A1,1 0 0,0 3,4A17,17 0 0,0 20,21A1,1 0 0,0 21,20V16.5A1,1 0 0,0 20,15.5Z" />
					</svg>
				</div>
				<div class='smscontactdate' id="smscontactdate">CONTACT_DATE</div>
		</div>

</div>`