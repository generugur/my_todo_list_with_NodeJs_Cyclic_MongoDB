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


// mongodb bağlantı noktası
const PORT = process.env.PORT || 3000;
mongoose.set("strictQuery", false);
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected: " + conn.connection.host);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}


// mongoose şema oluşturma
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
    List.findOne({
      name: listName
    }, function(err, foundList) {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }

});

// liste adlarını alabilmek için bir fonksiyon
let listNames = [];

function findListNames() {
  return List.find().select('name').exec();
}

function getListNames() {
  return new Promise((resolve, reject) => {
    findListNames()
      .then(names => {
        listNames = names.map(name => name);
        resolve(listNames);
      })
      .catch(error => reject(error));
  });
};


app.get("/", function(req, res) {
  getListNames()
  .then(listNames => {
    console.log("Listeler alındı.");
  })
  .catch(error => console.error(error));

  Item.find({}, function(err, foundItems) {
    if (foundItems.length === 0) {
      Item.insertMany(defaultItems, function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log("basarili-insert");
        }
      });
      res.redirect("/");
    } else {
      res.render("list", {
        listTitle: "Today",
        newListItems: foundItems,
        newLists: listNames
      });
    }
  });
});


// silmek için
app.post("/delete", function(req, res) {
  const checkedBoxId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    Item.findByIdAndRemove(checkedBoxId, function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log("basarili-delete");
        res.redirect("/");
      }
    });
  } else {
    List.findOneAndUpdate({
      name: listName
    }, {
      $pull: {
        items: {
          _id: checkedBoxId
        }
      }
    }, function(err, foundList) {
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
  if (req.params.customListName === "") {
    res.redirect("/");
  } else {
    const customListName = _.capitalize(req.params.customListName);
    List.findOne({
      name: customListName
    }, function(err, foundList) {
      if (err) {
        console.log(err);
      } else {
        if (foundList) {
          res.render("list", {
            listTitle: foundList.name,
            newListItems: foundList.items,
            // buraya fonksiyon yazıcam
            // yazdım ehehe
            newLists: listNames
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
  }
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log("Listening on port " + PORT);
  });
});
