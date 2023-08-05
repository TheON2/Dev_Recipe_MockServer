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

module.exports = function(app, User, Image, Post,Like,Report) {

  app.get('/api/post/:postId', async (req, res) => {
    try {
      const post = {
        id: 1,
        content: "ㅁㄴㅇㅁㄴㅇㅁㄴㅇㅁㄴㅇㅁㄴㅇㅁㅇ",
        musicTitle: "버즈(Buzz) - 가시 [가사/Lyrics]",
        musicUrl: "https://www.youtube.com/watch?v=1-Lm2LUR8Ss",
        tag: "도라에몽, 펀치",
        placeName: "전라남도 완도군 완도읍 신기길 56 3 ",
        latitude: 126.742,
        longitude: 34.3275,
        private: false,
        createdAt: "2023-08-03T07:51:46.000Z",
        updatedAt: "2023-08-03T07:51:46.000Z",
        userId: 1,
        image: {
          url: "https://avatars.githubusercontent.com/u/32028454?v=4"
        },
        comments : [
          {
            commentId: 1,
            comment: "댓글 내용 1",
            createdAt: "2023-08-03T07:51:46.000Z",
          },
          {
            commentId: 2,
            comment: "댓글 내용 2",
            createdAt: "2023-08-03T07:51:46.000Z",
          }
        ],
        likes: [
          {
            userId: 456
          },
          {
            userId: 789
          }],
        userLiked:  true,
        likeCount: 2,
      }

      res.send(post);

    } catch (error) {
      console.error('Error getting post:', error);
      res.status(500).send({ error: 'Error getting post' });
    }
  });

  app.get('/api/main', async (req, res) => {
    try {
      // 더미 데이터 생성
      const posts = Array.from({ length: 12 }).map((_, id) => ({
        id: id + 1,
        content: "ㅁㄴㅇㅁㄴㅇㅁㄴㅇㅁㄴㅇㅁㄴㅇㅁㅇ",
        musicTitle: "버즈(Buzz) - 가시 [가사/Lyrics]",
        musicUrl: "https://www.youtube.com/watch?v=1-Lm2LUR8Ss",
        tag: "도라에몽, 펀치",
        placeName: "전라남도 완도군 완도읍 신기길 56 3 ",
        latitude: 126.742,
        longitude: 34.3275,
        private: false,
        createdAt: "2023-08-03T07:51:46.000Z",
        updatedAt: "2023-08-03T07:51:46.000Z",
        userId: 1,
        image: {
          url: "https://avatars.githubusercontent.com/u/32028454?v=4"
        }
      }));
      const likePosts = Array.from({ length: 5 }).map((_, id) => ({
        id: id + 1,
        content: "ㅁㄴㅇㅁㄴㅇㅁㄴㅇㅁㄴㅇㅁㄴㅇㅁㅇ",
        musicTitle: "버즈(Buzz) - 가시 [가사/Lyrics]",
        musicUrl: "https://www.youtube.com/watch?v=1-Lm2LUR8Ss",
        tag: "도라에몽, 펀치",
        placeName: "전라남도 완도군 완도읍 신기길 56 3 ",
        latitude: 126.742,
        longitude: 34.3275,
        private: false,
        createdAt: "2023-08-03T07:51:46.000Z",
        updatedAt: "2023-08-03T07:51:46.000Z",
        userId: 1,
        image: {
          url: "https://avatars.githubusercontent.com/u/32028454?v=4"
        }
      }));

      res.send({posts,likePosts});

    } catch (error) {
      console.error('Error getting posts:', error);
      res.status(500).send({ error: 'Error getting posts' });
    }
  });

  app.post('/api/post/:postId/like', async (req, res) => {
    const { postId } = req.params; // URL 파라미터에서 postId를 추출
    const userId = "1";

    const like = await Like.findOne({ where: { userId, postId } });

    if (like) {
      await like.destroy();
      res.json({ message: 'Like removed.' });
    } else {
      await Like.create({ userId, postId });
      res.json({ message: 'Like added.' });
    }
  });

// 신고 토글 API
  app.post('/api/report/:postId', async (req, res) => {
    //const { userId } = req.body; // 요청 본문에서 userId를 추출
    const { postId } = req.params; // URL 파라미터에서 postId를 추출
    const userId = "1";

    const report = await Report.findOne({ where: { userId, postId } });

    if (report) {
      await report.destroy();
      res.json({ message: 'Report removed.' });
    } else {
      await Report.create({ userId, postId });
      res.json({ message: 'Report added.' });
    }
  });

  app.put('/api/post/:postId', upload.array('image', 5), async (req, res) => {
    const images = req.files;
    const { content, musicTitle, musicUrl, tag, latitude, longitude, placeName } = req.body;
    const postId = req.params.postId;

    try {
      // Find the existing post
      const post = await Post.findByPk(postId);

      if (!post) {
        return res.status(404).send({ error: 'Post not found' });
      }

      // Update the post
      await post.update({
        content,
        musicTitle,
        musicUrl,
        latitude,
        longitude,
        placeName,
        tag
      });

      // Delete old images
      await Image.destroy({
        where: {
          postId: postId
        }
      });

      // Add new images
      const imagePromises = images.map((image) => {
        return Image.create({
          url: req.protocol + '://' + req.get('host') + '/' + image.path, // 파일 경로를 URL로 변환
          postId: postId
        });
      });

      await Promise.all(imagePromises);

      res.status(200).send({ message: 'Post updated' });
    } catch(err) {
      console.error(err);
      res.status(500).send({ error: 'Error updating post' });
    }
  });
}
