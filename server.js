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

    if (request.method === 'POST' && request.url === '/registerdevice/'){

	let body = [];
	request.on('data', (chunk) => {
	        body.push(chunk);
	    }).on('end', () => {

		    body = Buffer.concat(body).toString();
		    const auth_token = JSON.parse(decodeURIComponent(body))["auth_token"];
		    const device_token  = JSON.parse(decodeURIComponent(body))["device_token"];
		    
		    admin.auth().verifyIdToken(auth_token)
		.then(function(decodedToken) {
		        var username = decodedToken.uid;
		        
		        var connection = mysql.createConnection({
			    host     : 'ecommunicate-production.cphov5mfizlt.us-west-2.rds.amazonaws.com',
			    user     : 'android_chat',
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
			user     : 'android_chat',
			password : mysql_db_password,
			database : 'ecommunicate',
			port : '3306',
			    });
		    
		    connection.connect();
		    
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


    if (request.method === 'POST' && request.url === '/receivedemails/') {
	
	let body = [];
	request.on('data', (chunk) => {
	        body.push(chunk);
	    }).on('end', () => {
		body = Buffer.concat(body).toString();
		const auth_token = JSON.parse(decodeURIComponent(body))["auth_token"];
		
		admin.auth().verifyIdToken(auth_token)
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
			
			received_email_ids = [];
			is_read_booleans = [];
			
			connection.query('select * from received_emails where username = "'+username+'" order by received_time desc;',function (error, results, fields) { 
			    
			    for (let i = 0, len = results.length; i < len; ++i) {
				received_email_ids.push(results[i]['id']);

				if (results[i]['is_read'] == 0)
				    is_read_booleans.push('false');
				else
				    is_read_booleans.push('true');

			    }
			    
			    
			});
		
			connection.end( function(error) { 

			    json_array = []

			    var items_processed = 0;

			    if (received_email_ids.length === 0 ) {
				
				response.write(JSON.stringify(json_array));
				
				response.end();
				
			    }

			    else {
			    

				for (let i = 0, len = received_email_ids.length; i < len; ++i){
				    
				    let source = fs.createReadStream('/efsemail/mail/vhosts/ecommunicate.ch/'+username+'/new/'+received_email_ids[i]);
				    
				    simpleParser(source, (err,mail) => {
					
					json_array.push({'subject' : mail.headers.get('subject'), 'from' : mail.headers.get('from')['value'][0]['address'], 'date' : mail.headers.get('date') , 'is_read' : is_read_booleans[i], 'id' : received_email_ids[i]})
					
					items_processed++;
					
					if (items_processed === len ) {
					    
					    response.write(JSON.stringify(json_array));
					    
					    response.end();
					    
					}
					
					
					//console.log(mail.text)
					
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
		const auth_token = JSON.parse(decodeURIComponent(body))["auth_token"];
		const email_id = JSON.parse(decodeURIComponent(body))["email_id"];
		
		admin.auth().verifyIdToken(auth_token)
		    .then(function(decodedToken) {
		        var username = decodedToken.uid;
			
			var connection = mysql.createConnection({
			    host     : 'ecommunicate-production.cphov5mfizlt.us-west-2.rds.amazonaws.com',
			    user     : 'android_email',
			    password : mysql_db_password,
			    database : 'ecommunicate',
			    port : '3306',
			});
			
			
			let source = fs.createReadStream('/efsemail/mail/vhosts/ecommunicate.ch/'+username+'/new/'+email_id);
				
			simpleParser(source, (err,mail) => {
			
			    json_object = {'subject' : mail.headers.get('subject'), 'from' : mail.headers.get('from')['value'][0]['address'], 'date' : mail.headers.get('date'), 'body' : mail.text , 'cc' : '' }
				    
			    response.write(JSON.stringify(json_object));
			    
			    response.end();


			    //console.log(mail.text)
			    
			});

			
		    });

	    });

    }

    if (request.method === 'POST' && request.url === '/sendemail/') {
	
	let body = [];
	request.on('data', (chunk) => {
	        body.push(chunk);
	    }).on('end', () => {
		body = Buffer.concat(body).toString();
		const auth_token = JSON.parse(decodeURIComponent(body))["auth_token"];
		const email_body = JSON.parse(decodeURIComponent(body))["body"];
		const email_subject = JSON.parse(decodeURIComponent(body))["subject"];
		const email_to = JSON.parse(decodeURIComponent(body))["to"];
		
		admin.auth().verifyIdToken(auth_token)
		    .then(function(decodedToken) {

			var username = decodedToken.uid;
			
			console.log(email_body);
			console.log(email_subject);
			console.log(email_to);

			let transporter = nodemailer.createTransport({
			    host: 'ecommunicate.ch',
			    port: 587,
			    secure: false, // true for 465, false for other ports                                                                                                          
			});
			
			// setup email data with unicode symbol                                                                                                                            
			
			let mailOptions = {
			    from: username + "@ecommunicate.ch", // sender address                                                                                      
			    to: email_to, // list of receivers                                                                                                              
			    subject: email_subject, // Subject line                                                                                                                            
			    text: email_body, // plain text body                                                                                                                       
			};
			
			// send mail with defined transport objec                                                                                                                          
			transporter.sendMail(mailOptions, (error, info) => {
			    
			    if (error) {
				console.log(error);
				return
			    }
			    console.log('Message sent: %s', info.messageId);
			    
			    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
			    
			});
			
			
		    });
	    });

    }

		

});
