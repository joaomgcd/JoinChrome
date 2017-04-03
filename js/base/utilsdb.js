var UtilsDB = {
	"getMmsImage": function(attachmentId){
		return UtilsDB.imagesDb.open()
		.then(()=>{
			return UtilsDB.imagesDb.images
			.where('id')
			.equals(attachmentId)
	    	.toArray();
		})
		.then(array=>{
			if(array && array.length > 0){
				return array[0];
			}
		});
	},
	"setMmsImage": function(attachmentId,data){
		return UtilsDB.imagesDb.images.put({id: attachmentId, data: data});
	},
}
UtilsDB.imagesDb = new Dexie("MmsImages");
UtilsDB.imagesDb.version(1).stores({
	images: 'id,data'
});
