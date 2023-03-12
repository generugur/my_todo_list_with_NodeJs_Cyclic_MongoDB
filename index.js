require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
mongoose.set("strictQuery", false);
const connectDB = async ()=> {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected: " + conn.connection.host);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}


const itemsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name doesn't exist!"]
  }
});

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to our todo list"
});

const item2 = new Item({
  name: "+ a basarak yeni madde ekleyebilirsin"
});

const item3 = new Item({
  name: "Silmek için buna basabilirsin"
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);


app.get("/", getItems, getLists, renderForm);

function getItems(req, res, next) {
  Item.find({}, function(err, foundItems) {
    if (foundItems.length === 0) {
      Item.insertMany(defaultItems, function(err) {
        if (err) next(err);
      });
      res.redirect("/");
    } else {
      // console.log("foundItems" + foundItems);
      res.locals.listTitle = "Today";
      res.locals.newListItems = foundItems;
      next();
    }
  });
};

function getLists(req, res, next) {
  List.find({}, function(err, foundLists) {
    if (err) next(err);
    // console.log("foundLists" + foundLists);
    // console.log(typeof foundLists);
    res.locals.newLists = foundLists;
    next();
  });
};

function renderForm(req, res) {
  console.log(res.locals);
  res.render("list", res.locals);
};


// app.get("/", function(req, res) {
//
//   Item.find({}, function(err, foundItems) {
//     if (foundItems.length === 0) {
//       Item.insertMany(defaultItems, function(err) {
//         if (err) {
//           console.log(err);
//         } else {
//           console.log("basarili-insert");
//         }
//       });
//       res.redirect("/");
//     } else {
//       console.log(foundItems);
//       res.render("list", {
//         listTitle: "Today",
//         newListItems: foundItems
//       });
//     }
//   });
// });


app.post("/", function(req, res) {

  const itemName = req.body.newItem;
  const listName = req.body.list;
  const item = new Item({
    name: itemName
  });
  if (listName === "Today") {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({name: listName}, function(err, foundList) {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }

});

app.post("/delete", function(req, res) {
  const checkedBoxId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    Item.findByIdAndRemove(checkedBoxId, function(err){
      if (err) {
        console.log(err);
      } else {
        console.log("basarili-delete");
        res.redirect("/");
      }
    });
  } else {
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedBoxId}}}, function(err, foundList) {
      if (!err) {
        res.redirect("/" + listName);
      }
    });
  }
});


app.get("/about", function(req, res) {
  res.render("about");
});

app.get("/:customListName", function(req, res) {
  const customListName = _.capitalize(req.params.customListName);
  List.findOne({name: customListName}, function(err, foundList) {
    if (err) {

    } else {
      if (foundList) {
        res.render("list", {
          listTitle: foundList.name,
          newListItems: foundList.items
        });
      } else {
        const list = new List({
          name: customListName,
          items: defaultItems
        });
        list.save();
        res.redirect("/" + customListName);
      }
    }
  });
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log("Listening on port " + PORT);
  });
});
