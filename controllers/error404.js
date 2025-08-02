export const error404Page = (req, res) => {
  res.render("error404.ejs", {
    title: "error 404",
  });
}