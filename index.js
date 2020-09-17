const functions = require('firebase-functions');
const admin = require('firebase-admin');
const app = require('express')();

admin.initializeApp();

const config = {
  apiKey: "AIzaSyD-Rsc_TeDP2FtGRKSxq2wuU0Mda7XAcos",
  authDomain: "socialape-b0fcd.firebaseapp.com",
  databaseURL: "https://socialape-b0fcd.firebaseio.com",
  projectId: "socialape-b0fcd",
  storageBucket: "socialape-b0fcd.appspot.com",
  messagingSenderId: "100390942543",
  appId: "1:100390942543:web:1d65993657c381574db73a",
  measurementId: "G-YCKWSK3880"
};


const firebase = require('firebase');
firebase.initializeApp(config);
const db = admin.firestore();

app.get('/screams', (req, res) => {
 db
  .collection('screams')
  .orderBy('createdAt', 'desc')
  .get()
  .then((data) => {
    let screams = [];
    data.forEach((doc) => {
      screams.push({
        screamId: doc.id,
        body: doc.data().body,
        userHandle: doc.data().userHandle,
        createdAt: doc.data().createdAt
      });
    })
    return res.json(screams);
  })
  .catch((err) => console.log(err));

})

app.post('/scream', (req, res) => {
  const newScream = {
    body: req.body.body,
    userHandle: req.body.userHandle,
    createdAt: new Date().toISOString()
  };

  db
  .collection('screams')
  .add(newScream)
  .then ((doc) => {
    res.json({message: `document ${doc.id} created successfully`});
  })
  .catch((err) => {
    res.status(500).json({error: 'something went wrong'})
    console.error(err);
  })
})
const isEmail = (email) => {
  const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
 if(email.match(emailRegEx)) return true;
 else return false;

}

const isEmpty = (string) => {
  if(string.trim() === '') return true;
  else return false;
}

// signup route
app.post('/signup', (req, res) => {
   const newUser = {
     email: req.body.email,
     password: req.body.password,
     comfirmPassword: req.body.comfirmPassword,
     handle: req.body.handle
   };

   let errors = {};
   if(isEmpty(newUser.email)) {
     errors.email = 'Must not be empty';
   } else if (!isEmail(newUser.email)){
     errors.email = 'Must be a valid email';
   }

   if(isEmpty(newUser.password)) errors.password = 'Must not be empty';
   if(newUser.password !== newUser.comfirmPassword) errors.comfirmPassword = ' Password must match';
   if(isEmpty(newUser.handle)) errors.handle = 'Must not be empty';
 
   if(Object.keys(errors).length > 0) return res.status(400).json(errors);

   //validate data
   let token, userId;
   db.doc(`/users/${newUser.handle}`).get()
      .then( doc => {
        if(doc.exits){
          return res.status(400).json({handle: 'this handle is already taken'})
        } else {
         return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password)
         
        }
      })
      .then((data) => {
        userId = data.user.uid;
        return data.user.getIdToken();
      })
      .then((idToken) => {
        token = idToken;
        const userCredentials = {
          handle: newUser.handle,
          email: newUser.email,
          createdAt: new Date().toISOString(),
          userId
        };
        return db.doc(`/users/${newUser.handle}`).set(userCredentials);
      }) 
      .then(() => {
        return res.status(201).json({token});
      })
      .catch((err) => {
        console.error(err);
        if(err.code === 'auth/email-already-in-use'){
          return res.status(400).json({email: 'Email is already in use'})
        } else {
          return res.status(500).json({error: err.code});
        }
        
      })
    })

    // login route 
    app.post('/login', (req, res) => {
      const user = {
        email: req.body.email,
        password: req.body.password
      }
      let errors = {};
      
      if(isEmpty(user.email)) errors.email = 'Must not be empty';
      if(isEmpty(user.password)) errors.password = 'Must not be empty';
    
      if(Object.keys(errors).length > 0) return res.status(500).json({errors});

      firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then((data) => {
          return data.user.getIdToken();
        })
        .then(token => {
          return res.json({token});
        })
        .catch((err) => {
          console.error(err);
          if(err.code === 'auth/wrong-password') {
            return res.status(403).json({general: 'Wrong credentilas, please try again'})
          } else return res.status(500).json({error: err.code});
        })
    })
  
exports.api = functions.https.onRequest(app);