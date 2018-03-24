var express = require('express');
var app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var pgp = require('pg-promise')(/*options*/);

app.use(express.static(__dirname + './../../')); //serves the index.html

var cn = {
    host: 'comp421.cs.mcgill.ca', // server name or IP address;
    port: 5432,
    database: 'cs421',
    user: 'cs421g14',
    password: 'cs421g14@comp421'
};

var db = pgp(cn);


app.listen(3000, () => {
    console.log('listening on 3000');
})

app.get('/getBills', function (req, res) {
  var query="SELECT c.firstname||' '||c.lastName Customer,o.roomid room,to_char(b.time,'YYYY-MM-DD') date, sum(cb.amount) Total,p.id paid FROM cs421g14.bill b " +
  " LEFT JOIN cs421g14.occupation o on b.occupationid=o.id" +
  " LEFT JOIN cs421g14.customer c on o.customerid=c.id" +
  " LEFT JOIN cs421g14.charge cb on cb.billid=b.id" +
  " LEFT JOIN cs421g14.payment p on p.billid=b.id" +
  " GROUP BY c.firstname,c.lastname,o.roomid,b.time,p.id"
  db.any(query)
    .then(data => {
        res.status(200).send(data);
    })
    .catch(error => {
        console.log(error);
        res.status(500).send("Server Error");
        return; // print the error;
    });

});
app.get('/getProfits', function (req, res) {

  var query="SELECT to_char(dd,'YYYY-MM-DD') date,SUM(p.amount) profit FROM" +
  " generate_series( '" + req.query.startDate + "'::timestamp , '" + req.query.endDate + "'::timestamp, '1 day'::interval) dd" +
  " LEFT JOIN cs421g14.payment p on date_trunc('day', dd)=p.time " +
  " GROUP BY to_char(dd,'YYYY-MM-DD') ORDER BY to_char(dd,'YYYY-MM-DD') ASC;"

  db.any(query)
    .then(data => {
        res.status(200).send(data);
    })
    .catch(error => {
        console.log(error);
        res.status(500).send("Server Error");
        return; // print the error;
    });

});
app.get('/getCustomers', function (req, res) {

    var query="SELECT id, firstname||' '||lastname customer FROM cs421g14.customer"
  
    db.any(query)
      .then(data => {
          res.status(200).send(data);
      })
      .catch(error => {
          console.log(error);
          res.status(500).send("Server Error");
          return; // print the error;
      });
  
  });
app.get('/getCustomers', function (req, res) {

    var query="SELECT id, firstname||' '||lastname customer FROM cs421g14.customer"
  
    db.any(query)
      .then(data => {
          res.status(200).send(data);
      })
      .catch(error => {
          console.log(error);
          res.status(500).send("Server Error");
          return; // print the error;
      });
  
});
app.get('/getRooms', function (req, res) {

    var query="SELECT roomnumber FROM cs421g14.room"
  
    db.any(query)
      .then(data => {
          res.status(200).send(data);
      })
      .catch(error => {
          console.log(error);
          res.status(500).send("Server Error");
          return; // print the error;
      });
  
  });
  app.get('/generateBills', function (req, res) {

    var noBill="SELECT o.id, date_part('day',o.checkouttime-o.arrivaltime) occupationlength,o.checkouttime, c.membership FROM cs421g14.occupation o " + 
    " LEFT JOIN cs421g14.customer c on o.customerid=c.id" +
    " WHERE o.id NOT IN (SELECT occupationid FROM cs421g14.bill)"
    //for(var i in data)
    db.any(noBill)
      .then(data => {
          for(var i in data){
                for(var i in data){

                    //create a bill for the occupation
                    db.none("INSERT INTO cs421g14.bill VALUES(DEFAULT, ${date},'standard',${occid})", {
                        date: data[i].checkouttime, //bills are created as checkoutdate
                        occid:data[i].id //occupation id for bill
                    }) 
                    charge = data[i].occupationlength * 40 //40 per day 
                    //add an occupation charge for this bill lvl 3 members get  10% discount
                    if(data[i].membership ===3){
                        charge = charge * 0.90
                    }

                    //get id of jus created bill
                    db.one("SELECT id FROM cs421g14.bill WHERE occupationid=" + data[i].id).then(billID => {

                        //insert the charge for the room
                        db.none("INSERT INTO cs421g14.charge VALUES(DEFAULT, ${amount},${qst},${pst},'standard room charge','room charge',${time},${billid})", {
                            amount: charge, //full amount
                            qst: charge * 0.10, //qc 10%
                            pst:charge * 0.05, //5%
                            time:data[i].checkouttime,
                            billid:billID.id,
                        })       

                    });
                }
          }
          res.status(200).send(data.length);// get new bills;
      })
      .catch(error => {
          console.log(error);
          res.status(500).send("Server Error");
          return; // print the error;
      });
  
  });
  app.post('/addRes', function (req, res) {
      var reservation=req.body;
     //check if room is reserved between those days 
     var query="SELECT roomid FROM cs421g14.reservation WHERE arrivalTime <= '" + reservation.startDate  +
      "' AND DepartureTime >= '" + reservation.endDate  + "' AND roomid=" + reservation.room;
    db.any(query)
      .then(data => {
        if(data.length===0){
            db.none("INSERT INTO cs421g14.reservation VALUES(${start}, ${end},${room},${customer},'New Reservation')", {
                start: reservation.startDate,
                end: reservation.endDate,
                room: reservation.room,
                customer: reservation.customer 
            })
            res.status(200).send("Reservation Created");
        }else{
            res.status(409).send("Room reserved for those dates"); 
        }
      })
      .catch(error => {
          console.log(error);
          res.status(500).send("Server Error");
          return; // print the error;
      });

  });