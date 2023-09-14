const express=require("express");
const bodyParser=require("body-parser");
const session = require("express-session");

const app=express();
var jsonParser = bodyParser.json()
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({ secret: "ahshsgdush", resave: true, saveUninitialized: true }));
app.set('view engine', 'ejs');
app.get("/",function(req,res){
    res.render("home");
});


app.post("/page1",function(req,res){
    const num1=req.body.num1;
    res.render("page1",{num1});
    
    
});
app.post('/page2', (req, res) => {
    const submittedNames = [];
    const num1 = req.body.num1;
    

    // console.log('Form Data:', req.body); // Add this console.log
    // console.log(Object.keys(req.body).length);
    for (let i = 0; i < num1; i++) {
        const nameField = `name${i}`;
        const nameValue = req.body[nameField];
        submittedNames.push(nameValue);
    }
    req.session.submittedNames = submittedNames;
    // console.log('Submitted Names:', submittedNames);
    res.render('page2', { submittedNames,num1 });
    
});

app.post('/page3',(req,res)=>{
    const num1=req.body.num1;
    const num2=req.body.num2;
    
    res.render("page3",{num1,num2});
})
app.post('/page4', (req, res) => {
    const transactions = [];
    const num1_temp = req.body.num1;
    const num1=parseInt(num1_temp[0]);
    const submittedNames = req.session.submittedNames;
    
    for (let i = 0; i < num1; i++) {
        transactions.push(new Array(num1).fill(0));
    }
    const num2_temp = req.body.num2;
    const num2=parseInt(num2_temp[0]);
    console.log(num1);
    console.log(num2);
    for (let i = 0; i < num2; i++) {
        const borrower = req.body[`borrower${i}`];
        const lender = req.body[`lender${i}`];
        const amount = parseInt(req.body[`amount${i}`]);

        const borrowerIndex = submittedNames.indexOf(borrower);
        const lenderIndex = submittedNames.indexOf(lender);

        if (borrowerIndex !== -1 && lenderIndex !== -1) {
            transactions[borrowerIndex][lenderIndex] += amount;
        }
    }

    // Now 'transactions' contains the 2D matrix with borrowed amounts
    const optimizedTransactions = minCashFlow(transactions, num1);

    // You can pass 'transactions' to the page where you want to display it
    res.render('page4', {submittedNames,optimizedTransactions});
});





function solve(amount, ans) {
    let minIdx = 0;
    let maxIdx = 0;
    
    for (let i = 1; i < amount.length; i++) {
        if (amount[i] < amount[minIdx]) {
            minIdx = i;
        }
    }
    
    for (let i = 1; i < amount.length; i++) {
        if (amount[i] > amount[maxIdx]) {
            maxIdx = i;
        }
    }
    
    if (amount[minIdx] === 0 || amount[maxIdx] === 0) {
        return;
    }
    
    const give = Math.min(-amount[minIdx], amount[maxIdx]);
    amount[minIdx] += give;
    amount[maxIdx] -= give;
    
    ans[minIdx][maxIdx] = give;
    solve(amount, ans);
}

function minCashFlow(transactions, n) {
    const amount = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            amount[i] += transactions[j][i] - transactions[i][j];
        }
    }

    const ans = new Array(n).fill(0).map(() => new Array(n).fill(0));
    solve(amount, ans);
    return ans;
}

app.listen(3000,function(){
    console.log("Server is running on port 3000");
});
