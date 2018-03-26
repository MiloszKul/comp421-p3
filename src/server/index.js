var express = require('express');
var app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var pgp = require('pg-promise')(/*options*/);

app.use(express.static(__dirname + './../../')); //serves the index.html


//connection config
var cn = {
    host: 'comp421.cs.mcgill.ca', // server name or IP address;
    port: 5432,
    database: 'cs421',
    user: 'cs421g14',
    password: 'cs421g14@comp421'
};

var db = pgp(cn);

//end point listening
app.listen(3000, () => {
    console.log('listening on 3000');
})

//retrieves bills from db
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

//profits for visualization
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

//get list of employees
app.get('/getEmployees', function (req,res){
    db.any("SELECT sin, firstname||' '||lastname employee FROM cs421g14.employee")
        .then(data => {
            res.status(200).send(data);
        })
        .catch(error => {
            console.log(error);
            res.status(500).send("Server Error");
            return; // print the error;
        });
});

//retrieve specific employee
app.get('/getEmployee', function (req,res){
    db.one("SELECT * FROM cs421g14.employee WHERE sin='" + req.query.sin + "'")
        .then(data => {
            res.status(200).send(data);
        })
        .catch(error => {
            console.log(error);
            res.status(500).send("Server Error");
            return; // print the error;
        });
});

//retrieve list of janitors
app.get('/getJanitors', function (req, res) {
    db.any("SELECT sin, firstname||' '||lastname employee FROM cs421g14.employee WHERE sin in (SELECT sin from cs421g14.cleans)")
        .then(data => {
            res.status(200).send(data);
        })
        .catch(error => {
            console.log(error);
            res.status(500).send("Server Error");
            return; // print the error;
        });
});

//adds cleaning schedule overwrites schedules for same room and date if there are any
app.post('/addCleaning', function (req, res) {

    //overwrite cleaning for this day
    var reqData = req.body
    db.any("DELETE From cs421g14.cleans WHERE roomnumber=" + reqData.room + " AND schedule='" + reqData.cleanDate + "'::timestamp")
        .then(data => {
            
            db.none("INSERT INTO cs421g14.cleans VALUES(${sin},${room},${sched})", {
                sin: reqData.janitor,
                room: reqData.room,
                sched: reqData.cleanDate
            })
            res.status(200).send("New Cleaning Created");
        })
        .catch(error => {
            console.log(error);
            res.status(500).send("Server Error");
            return; // print the error;
        });

});

//updates an employee
app.post('/setEmployee', function (req,res){
  var employee=req.body;
  db.none("UPDATE cs421g14.employee SET address='" + employee.address +
  "',zipcode='" + employee.zipcode + "',telephonenumber='" + employee.telephonenumber +
  "',firstname='" + employee.firstname + "',lastname='" + employee.lastname +
  "',company='" + employee.company + "',salary=" + employee.salary + " WHERE sin='" + employee.sin + "' ");

  res.status(200).send("employee updated");
});

//gets a room reservation
app.get('/getRoomReservation', function (req, res) {

    var query = "SELECT r.CNT rCNT,o.CNT oCNT FROM" +
                "(SELECT COUNT(r.roomid) CNT FROM cs421g14.reservation r" +
                " WHERE r.Status = 'New Reservation' AND" +
                " r.arrivalTime >= '" + req.query.startDate + "'::timestamp AND" +
                " r.departuretime <= '" + req.query.startDate + "'::timestamp) r," +
                " (SELECT COUNT(o.roomid) CNT FROM cs421g14.occupation o" +
                " WHERE o.arrivalTime >= '" + req.query.startDate + "'::timestamp AND " +
                " o.checkouttime <= '" + req.query.startDate + "'::timestamp) o"


    db.any(query)
      .then(data => {
          res.status(200).send(data[0]);
      })
      .catch(error => {
          console.log(error);
          res.status(500).send("Server Error");
          return; // print the error;
      });

});

//retreives all customers 
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

//retreive all rooms 
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

//create all bills then create charges for room based on stay length
  app.get('/generateBills', function (req, res) {

    var noBill="SELECT o.id, date_part('day',o.checkouttime-o.arrivaltime) occupationlength,o.checkouttime, c.membership FROM cs421g14.occupation o " +
    " LEFT JOIN cs421g14.customer c on o.customerid=c.id" +
    " WHERE o.id NOT IN (SELECT occupationid FROM cs421g14.bill)"
    //for(var i in data)
    db.any(noBill)
      .then(data => {
            for(var i in data){

                //create a bill for the occupation
                db.none("INSERT INTO cs421g14.bill VALUES(DEFAULT, ${date},'standard',${occid})", {
                    date: data[i].checkouttime, //bills are created as checkoutdate
                    occid:data[i].id //occupation id for bill
                });
                charge = parseInt(data[i].occupationlength) * 40 +1//40 per day

                //get id of jus created bill
                db.any("SELECT id FROM cs421g14.bill WHERE occupationid=" + parseInt(data[i].id)).then(billID => {
                    //insert the charge for the room
                    db.none("INSERT INTO cs421g14.charge VALUES(DEFAULT, ${amount},${qst},${pst},'standard room charge','room charge',${time},${billid})", {
                        amount: charge, //full amount
                        qst: charge * 0.10, //qc 10%
                        pst:charge * 0.05, //5%
                        time:data[i].checkouttime,
                        billid:billID[0].id,
                    })
                }).catch(err=>{console.log("error")});
            };
          res.status(200).send('Ok');// get new bills;
      })
      .catch(error => {
          console.log(error);
          res.status(500).send("Server Error");
          return; // print the error;
      });

});

//create new reservation
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
