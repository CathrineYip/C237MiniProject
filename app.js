const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const multer=require('multer');
const app = express();

const storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,'public/images');
    },
    filename:(req,file,cb)=>{
        cb(null,file.originalname);
    }
});
const upload=multer({storage:storage});


const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3304,
    database: 'parentica'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    const sqlReview = 'SELECT * FROM reviews';
    connection.query(sqlReview, (error, reviews) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving Reviews');
        }

        const reviewID = reviews.map(review => review.reviewID);
        if (reviewID.length > 0) {
            const sqlComments = 'SELECT * FROM comments WHERE reviewID IN(?)';
            connection.query(sqlComments, [reviewID], (err, comments) => {
                if (err) {
                    console.error('Database query error:', err.message);
                    return res.status(500).send('Error Retrieving Comments');
                }

                reviews.forEach(review => {
                    review.comments = comments.filter(comment => comment.reviewID === review.reviewID);
                });

                res.render('index', { reviews });
            });
        } else {
            res.render('index', { reviews: [] });
        }
    });
});


app.get('/reviews/:id', (req, res) => {
    const reviewID = req.params.id;
    const sql = 'SELECT * FROM reviews WHERE reviewID = ?';
    connection.query(sql, [reviewID], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving Review by ID');
        }
        if (results.length > 0) {
            res.render('review', { reviews: results[0] });
        } else {
            res.status(404).send('Review not found');
        }
    });
});

app.get('/addReviewsForm', (req, res) => {
    res.render('addReview');
});

app.post('/addReviewsForm',upload.single('image'), (req, res) => {
    const { username, description} = req.body;
    let image;
    if(req.file){
        image=req.file.filename;
    }else{
        image=null;
    }

    const sql = 'INSERT INTO reviews (username, description,image) VALUES (?, ?, ?)';
    connection.query(sql, [username, description,image], (error, results) => {
        if (error) {
            console.error('Error adding review:', error.message);
            res.status(500).send('Error Adding Reviews');
        } 
        res.redirect('/');
    });
});

app.get('/reviews/:id', (req, res) => {
    const reviewID = req.params.id;
    const sql = 'SELECT * FROM comments WHERE reviewID = ?';
    connection.query(sql, [reviewID], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving Comments');
        }
        res.render('index', { reviews: { reviewID, comments: results } });
    });
});

app.post('/comments', (req, res) => {
    const {reviewID,description} = req.body;
    const sql = 'INSERT INTO comments (description,reviewID) VALUES (?,?)';
    connection.query(sql, [ description,reviewID], (error, results) => {
        if (error) {
            console.error('Error adding comments:', error.message);
            res.status(500).send('Error Adding Comments');
        } else{
        res.redirect('/');
        }
    });
});

app.post('/edit/:id', (req, res) => {
    const commentsID=req.params.id;
    const { description} = req.body;
    const sql = 'UPDATE comments SET description=? WHERE commentsID=?';
    connection.query(sql, [ description,commentsID], (error, results) => {
        if (error) {
            console.error('Error updating comment:', error.message);
            res.status(500).send('Error Updating Comment');
        } else{
        res.redirect('/');
        }
    });
});
   
app.get('/delete/:id', (req, res) => {
    const commentsID=req.params.id;
    const sql = 'DELETE FROM comments WHERE commentsID = ?';
    connection.query(sql, [commentsID], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Deleting Comment');
        }
        res.redirect('/');
  });
});

app.get('/editReview/:id', (req, res) => {
    const reviewID = req.params.id;
    const sql = 'SELECT * FROM reviews WHERE reviewID = ?';
    connection.query(sql, [reviewID], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving Review');
        }
        if (results.length > 0) {
            res.render('editReview', { reviews: results[0] });
        } else {
            res.redirect('/');
        }
    });
});

app.post('/editReview/:id',upload.single('image'), (req, res) => {
    const reviewID = (req.params.id);
    const { username, description } = req.body;
    let image=req.body.currentImage;
    if(req.file){
        image=req.file.filename;
    }
    const sqlUpdate = 'UPDATE reviews SET username=?, description=? ,image=? WHERE reviewID=?';
    connection.query(sqlUpdate, [username, description, image,reviewID], (error,results) => {
        if (error) {
            console.error('Database error:', error.message);
            return res.status(500).send('Error Editing Review');
        }
        res.redirect('/');
    });
});

app.get('/deleteReview/:id', (req, res) => {
    const reviewID = req.params.id;
    const sqlDelete = 'DELETE FROM reviews WHERE reviewID = ?';
    connection.query(sqlDelete, [reviewID], (error,results) => {
        if (error) {
            console.error('Database delete error:', error.message);
            return res.status(500).send('Error Deleting Review');
        }else{
            res.redirect('/');
        }
    });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});