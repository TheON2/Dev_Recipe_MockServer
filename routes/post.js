const bcrypt = require('bcrypt')
const {isNotLoggedIn, isLoggedIn} = require("./middlewares");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const auth = require("../jwt/auth");
const refreshauth = require("../jwt/refreshauth");
const dotenv = require("dotenv");
const multer = require('multer');
const axios = require("axios");
const fs = require('fs');

const uploadDir = './uploads/';

// 디렉토리가 없으면 생성
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // 업로드할 디렉토리 설정
  },
  filename: function (req, file, cb) {
    const now = new Date().toISOString();
    const date = now.replace(/:/g, '-'); // ':' 문자를 '-' 문자로 대체
    cb(null, date + file.originalname); // 저장될 파일명 설정
  }
});

const upload = multer({storage: storage});

dotenv.config();

module.exports = function(app, User, Image, Post) {
  app.post('/api/post', upload.array('image', 5), async (req, res) => {
    const images = req.files;
    const { content, musicTitle, musicUrl, tag, latitude, longitude, placeName } = req.body;
    try {
      const userId = "1"

      const post = await Post.create({
        content,
        musicTitle,
        musicUrl,
        latitude,
        longitude,
        placeName,
        tag,
        userId
      });
      console.log(images)

      console.log(post.dataValues.id)

      const imagePromises = images.map((image) => {
        console.log(image.path);
        console.log(post.postId);
        return Image.create({
          url: req.protocol + '://' + req.get('host') + '/' + image.path, // 파일 경로를 URL로 변환
          postId: post.dataValues.id,
          userId: userId
        });
      });

      await Promise.all(imagePromises);

      res.status(200).send({ message: 'Post received' });
    } catch(err) {
      console.error(err);
      res.status(500).send({ error: 'Error creating post' });
    }
  });

  app.get('/api/post/:postId', async (req, res) => {
    try {
      const postId = req.params.postId;

      const post = await Post.findOne({
        where: {
          id: postId
        }
      });

      const images = await Image.findAll({
        where: {
          postId: postId
        }
      });

      if (!post) {
        return res.status(404).send({ error: 'Post not found' });
      }

      res.send({post,images});

    } catch (error) {
      console.error('Error getting post:', error);
      res.status(500).send({ error: 'Error getting post' });
    }
  });

  app.get('/youtube/search', async (req, res) => {
    const { term } = req.query;
    try {
      const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
        params: {
          part: 'snippet',
          maxResults: 5,
          key: process.env.YOUTUBE_API_KEY,
          q: term,
          type: 'video',
        },
      });

      const items = response.data.items.map(item => {
        return {
          videoId: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.default.url,
        };
      });

      res.send(items);
    } catch (error) {
      console.error('Error searching YouTube:', error);
      res.status(500).send({ error: 'Error searching YouTube' });
    }
  });

  app.get('/map/reversegeocode', async (req, res) => {
    const { x, y } = req.query;
    try {
      const response = await axios.get('https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc', {
        params: {
          coords: `${x},${y}`,
          orders: 'roadaddr',
          output: 'json',
        },
        headers: {
          'X-NCP-APIGW-API-KEY-ID': `${process.env.R_GEO_API_KEY}`,
          'X-NCP-APIGW-API-KEY': `${process.env.R_GEO_API_SECRET_KEY}`,
        },
      });
      res.send(response.data);
    } catch (error) {
      console.error('Error getting geocode:', error);
      res.status(500).send({ error: 'Error getting geocode' });
    }
  });
}
