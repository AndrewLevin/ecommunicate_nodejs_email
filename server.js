const fs = require('fs');
const http = require('http');
const https = require('https');

const hostname = 'ec2-35-161-249-142.us-west-2.compute.amazonaws.com';
const port = 443;

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/email.android.ecommunicate.ch/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/email.android.ecommunicate.ch/fullchain.pem')
};

var admin = require("firebase-admin");

var serviceAccount = require("/home/ec2-user/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ecommunicate-5a295.firebaseio.com"
});




const server = https.createServer(options, (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  //res.end('Test\n');
});


server.listen(port, hostname, () => {
  console.log(`Server running at https://${hostname}:${port}/`);
});

var mysql_db_password = fs.readFileSync('/home/ec2-user/secrets.txt').toString().split('\n')[0];

var mysql      = require('mysql');
 
crypto = require('crypto');

const simpleParser = require('mailparser').simpleParser;

nodemailer = require('nodemailer');

server.on('request', (request, response) => {

    var now = new Date();

    console.log(now.toISOString());
    console.log(request.url);
    console.log(request.method);
    console.log(request.headers);

    if (request.method === 'POST' && request.url === '/downloadattachment/'){

	let body = [];
	request.on('data', (chunk) => {
	        body.push(chunk);
	    }).on('end', () => {

		body = Buffer.concat(body).toString();
		const id_token = JSON.parse(decodeURIComponent(body))["id_token"];
		const sent = JSON.parse(decodeURIComponent(body))["sent"];
		const attachment_id = JSON.parse(decodeURIComponent(body))["attachment_id"];
		const email_id = JSON.parse(decodeURIComponent(body))["email_id"];

		
		admin.auth().verifyIdToken(id_token)
		    .then(function(decodedToken) {
		        var username = decodedToken.uid;

			maildirname = "ecommunicate.ch"

			if(sent)
			    maildirname = "ecommunicate.ch-sent"

			let source = fs.createReadStream('/efsemail/mail/vhosts/'+maildirname+'/'+username+'/new/'+email_id);
				
			simpleParser(source, (err,mail) => {
			
			    if (mail.attachments) {
                                mail.attachments.forEach(function(attachment) {

				    if (attachment.headers.get("x-attachment-id") == attachment_id) {

					response.write(attachment.content);

					response.end();
					
				    }

				});
				
			    }
			});

		    });
	    });

    }
				   			    



    if (request.method === 'POST' && request.url === '/registerdevice/'){

	let body = [];
	request.on('data', (chunk) => {
	        body.push(chunk);
	    }).on('end', () => {

		    body = Buffer.concat(body).toString();
		    const id_token = JSON.parse(decodeURIComponent(body))["id_token"];
		    const device_token  = JSON.parse(decodeURIComponent(body))["device_token"];
		    
		    admin.auth().verifyIdToken(id_token)
		    .then(function(decodedToken) {
		        var username = decodedToken.uid;
		        
		        var connection = mysql.createConnection({
			    host     : 'ecommunicate-production.cphov5mfizlt.us-west-2.rds.amazonaws.com',
			    user     : 'android_email',
			    password : mysql_db_password,
			    database : 'ecommunicate',
			    port : '3306',
			        });
		        
		        connection.connect();
		        
		        var now = new Date();

		        connection.query('insert into device_tokens_email set username = "'+username+'", token="'+device_token+'", registration_time="'+now.toISOString()+'";',function (error, results, fields) {
			     
			    if (error) console.log(error);
			     
			        });
		        
		        connection.end();
		        
		        response.end();

		    }).catch(function(error) {
			    
			    console.log(error);
			    
			    // Handle error
			});
		    
		    
		    

		})
    }

    if (request.method === 'POST' && request.url === '/login/') {
	
	let body = [];
	request.on('data', (chunk) => {
	        body.push(chunk);
	    }).on('end', () => {
		    body = Buffer.concat(body).toString();
		    const username = JSON.parse(decodeURIComponent(body))["username"];
		    
		    var connection = mysql.createConnection({
			host     : 'ecommunicate-production.cphov5mfizlt.us-west-2.rds.amazonaws.com',
			user     : 'android_email',
			password : mysql_db_password,
			database : 'ecommunicate',
			port : '3306',
			    });
		    
		    connection.connect();
		    
		console.log('select * from user_info where username = "'+username+'";');

		    connection.query('select * from user_info where username = "'+username+'";',function (error, results, fields) {
			
			const hash = crypto.createHash('sha256')
			    .update(JSON.parse(decodeURIComponent(body))["password"])
			    .digest('hex');
			
			if(results.length == 1 &&  results[0]['hashed_password'] === hash){
			        admin.auth().createCustomToken(username)
			    .then(function(customToken) {
				    response.write(customToken);

				    response.end();
				})
			    .catch(function(error) {
				    response.write("Unsuccessful login.");
				    response.end();
				    console.log("Error creating custom token:", error);
				});
			        
			    } else {
				    response.write("Unsuccesful login.");
				    response.end();
				    console.log("Unsuccessful login for username "+ username+".");
				    
				}
			
			    });
		    
		    connection.end();
		    
		});
    }


    if (request.method === 'POST' && request.url === '/emails/') {
	
	let body = [];
	request.on('data', (chunk) => {
	        body.push(chunk);
	    }).on('end', () => {
		body = Buffer.concat(body).toString();
		const id_token = JSON.parse(decodeURIComponent(body))["id_token"];
		const sent = JSON.parse(decodeURIComponent(body))["sent"];

		admin.auth().verifyIdToken(id_token)
		    .then(function(decodedToken) {
		        var username = decodedToken.uid;
			
			var connection = mysql.createConnection({
			    host     : 'ecommunicate-production.cphov5mfizlt.us-west-2.rds.amazonaws.com',
			    user     : 'android_email',
			    password : mysql_db_password,
			    database : 'ecommunicate',
			    port : '3306',
			});
			
			connection.connect();
			
			email_ids = [];
			is_read_booleans = [];
			
			sent_or_received = "received"

			if (sent)
			    sent_or_received = "sent"

			connection.query('select * from '+sent_or_received+'_emails where username = "'+username+'" order by '+sent_or_received+'_time desc;',function (error, results, fields) { 
			    
			    for (let i = 0, len = results.length; i < len; ++i) {
				email_ids.push(results[i]['id']);

				if (!sent){
				    if (results[i]['is_read'] == 0)
					is_read_booleans.push('false');
				    else
					is_read_booleans.push('true');
				}


			    }
			    
			    
			});
		
			connection.end( function(error) { 

			    json_array = []

			    var items_processed = 0;

			    if (email_ids.length === 0 ) {
				
				response.write(JSON.stringify(json_array));
				
				response.end();
				
			    }

			    else {
			    

				json_array = [];

				for (let i = 0, len = email_ids.length; i < len; ++i){

				    json_array.push({});
				}


				for (let i = 0, len = email_ids.length; i < len; ++i){
				

				    var maildirname = "ecommunicate.ch"
				    
				    if (sent)
					maildirname = "ecommunicate.ch-sent"
				    
				    let source = fs.createReadStream('/efsemail/mail/vhosts/'+maildirname+'/'+username+'/new/'+email_ids[i]);
				    

				    simpleParser(source, (err,mail) => {
					

					if (sent)
					    json_array[i] = {'subject' : mail.headers.get('subject'), 'to' : mail.headers.get('to')['value'][0]['address'], 'date' : mail.headers.get('date'),  'email_id' : email_ids[i]}
					else
					    json_array[i] = {'subject' : mail.headers.get('subject'), 'from' : mail.headers.get('from')['value'][0]['address'], 'date' : mail.headers.get('date') , 'is_read' : is_read_booleans[i], 'email_id' : email_ids[i]}


					
					items_processed++;
					
					if (items_processed === len ) {
					    
					    response.write(JSON.stringify(json_array));
					    
					    response.end();
					    
					}
				    
				    });
				    
				    
				}
				
				
			    }

			});

		    });
	    });

    }


    if (request.method === 'POST' && request.url === '/readone/') {
	
	let body = [];
	request.on('data', (chunk) => {
	        body.push(chunk);
	    }).on('end', () => {
		body = Buffer.concat(body).toString();
		const id_token = JSON.parse(decodeURIComponent(body))["id_token"];
		const email_id = JSON.parse(decodeURIComponent(body))["email_id"];
		const sent = JSON.parse(decodeURIComponent(body))["sent"];
		
		admin.auth().verifyIdToken(id_token)
		    .then(function(decodedToken) {
		        var username = decodedToken.uid;
			
			var connection = mysql.createConnection({
			    host     : 'ecommunicate-production.cphov5mfizlt.us-west-2.rds.amazonaws.com',
			    user     : 'android_email',
			    password : mysql_db_password,
			    database : 'ecommunicate',
			    port : '3306',
			});
			
			
			maildirname = "ecommunicate.ch"

			if(sent)
			    maildirname = "ecommunicate.ch-sent"

			let source = fs.createReadStream('/efsemail/mail/vhosts/'+maildirname+'/'+username+'/new/'+email_id);
				

			if (!sent)
		            connection.query('update received_emails set is_read=1 where id="'+email_id+'";',function (error, results, fields) { } );

			connection.end();

			simpleParser(source, (err,mail) => {
			
			    json_object = {'subject' : mail.headers.get('subject'), 'from' : mail.headers.get('from')['value'][0]['address'], 'date' : mail.headers.get('date'), 'body' : mail.text , 'cc' : '' , 'to' : mail.headers.get('to')['value'][0]['address'], 'attachments' : []}
			    
			    if (mail.attachments) {
                                mail.attachments.forEach(function(attachment) {
//				    console.log(attachment.headers.get("content-description"));

				    json_object['attachments'].push({'filename' : attachment.headers.get("content-description"), 'id' : attachment.headers.get("x-attachment-id")})

				    
				});
				
			    }
			    


		    
			    response.write(JSON.stringify(json_object));
			    
			    response.end();


			    //console.log(mail.text)
			    
			});

			
		    });

	    });

    }

    if (request.method === 'POST' && request.url === '/reply/') {
	
	let body = [];
	request.on('data', (chunk) => {
	        body.push(chunk);
	    }).on('end', () => {
		body = Buffer.concat(body).toString();
		const id_token = JSON.parse(decodeURIComponent(body))["id_token"];
		const email_id = JSON.parse(decodeURIComponent(body))["email_id"];
		const sent = JSON.parse(decodeURIComponent(body))["sent"];
		
		admin.auth().verifyIdToken(id_token)
		    .then(function(decodedToken) {
		        var username = decodedToken.uid;
			
			maildirname = "ecommunicate.ch"

			if(sent)
			    maildirname = "ecommunicate.ch-sent"

			let source = fs.createReadStream('/efsemail/mail/vhosts/'+maildirname+'/'+username+'/new/'+email_id);

			simpleParser(source, (err,mail) => {

			    reply_body = "\nOn "+mail.headers.get('date') + ", " + mail.headers.get('from')['value'][0]['address'] + " wrote:\n"

			    for (let i = 0, len = mail.text.split('\n').length; i < len; ++i) {
				reply_body = reply_body + "> " + mail.text.split('\n')[i]+"\n"
			    }


			    json_object = {'subject' : "Re: " + mail.headers.get('subject'), 'date' : mail.headers.get('date'), 'body' : reply_body , 'cc' : '' , 'to' : mail.headers.get('from')['value'][0]['address']}

			    if (sent)
			    	json_object = {'subject' : "Re: " + mail.headers.get('subject'), 'date' : mail.headers.get('date'), 'body' : reply_body , 'cc' : '' , 'to' : mail.headers.get('to')['value'][0]['address']}

				    
			    response.write(JSON.stringify(json_object));
			    
			    response.end();


			    //console.log(mail.text)
			    
			});

			
		    });

	    });

    }


    if (request.method === 'POST' && request.url === '/new_email/'){
	
	let body = [];
	request.on('data', (chunk) => {
	        body.push(chunk);
	    }).on('end', () => {

		body = Buffer.concat(body).toString();
		var username = JSON.parse(decodeURIComponent(body))["username"];
		
		var connection = mysql.createConnection({
		    host     : 'ecommunicate-production.cphov5mfizlt.us-west-2.rds.amazonaws.com',
		    user     : 'android_email',
		    password : mysql_db_password,
			database : 'ecommunicate',
		    port : '3306',
		});
		
		connection.connect();
		
		device_tokens = []

		connection.query('select token from device_tokens_email where username = "'+username+'";',function (error, results, fields) { 
		    
		    for (let i = 0, len = results.length; i < len; ++i) {
			
			device_tokens.push(results[i]["token"]);
			
		    }
		    
		});
		
		connection.end( function(error) {
		    
		    for (let i = 0, len = device_tokens.length; i < len; ++i) {
			
			var token = device_tokens[i];
			
			var payload = {
			    notification: {
				title: "",
				body: "",
				collapse_key : 'ecommunicate email',
				tag : 'ecommunicate email'
				
			    },
			};
			
			admin.messaging().sendToDevice(token, payload)
			    .then(function(response) {
				console.log("Successfully sent message:", response);
			    })
			    .catch(function(error) {
				console.log("Error sending message:", error);
			    });
		    }    
		});
	    });
    }
		 
	
	
	
    if (request.method === 'POST' && request.url === '/sendemail/') {
	
	let body = [];
	request.on('data', (chunk) => {
	        body.push(chunk);
	    }).on('end', () => {
		body = Buffer.concat(body).toString();
		const id_token = JSON.parse(decodeURIComponent(body))["id_token"];
		const email_body = JSON.parse(decodeURIComponent(body))["body"];
		const email_subject = JSON.parse(decodeURIComponent(body))["subject"];
		const email_to = JSON.parse(decodeURIComponent(body))["to"];
		
		admin.auth().verifyIdToken(id_token)
		    .then(function(decodedToken) {

			var username = decodedToken.uid;
			
			console.log(email_body);
			console.log(email_subject);
			console.log(email_to);

			let transporter = nodemailer.createTransport({
			    host: 'ecommunicate.ch',
			    port: 587,
			    secure: false,
			});
			let mailOptions = {
			    from: username + "@ecommunicate.ch",
			    to: email_to, 
			    subject: email_subject,
			    text: email_body,
			};
			transporter.sendMail(mailOptions, (error, info) => {
			    
			    if (error) {
				console.log(error);
				return
			    }
			    console.log('Message sent: %s', info.messageId);
			    
			    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
			    
			    response.end();

			});
			
			
		    });
	    });

    }

		

});
