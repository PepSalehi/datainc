# combined$DEST is the airport id 
# https://en.wikipedia.org/wiki/List_of_airports_in_the_United_States

mean(combined$ARR_DELAY, na.rm = TRUE)
quantile(combined$ARR_DELAY, .9, na.rm = TRUE)
median(combined$ARR_DELAY, na.rm = TRUE)

library(dplyr)
# different versions of df; select one
df <- combined %>% mutate(status = ifelse(ARR_DELAY < 0, "early", ifelse((ARR_DELAY >= 0 & ARR_DELAY <=5), "ontime", "late" )))

df <- combined %>%   filter(!is.na(ARR_DELAY)) %>%  mutate(status = ifelse(ARR_DELAY < 5, "early",  "late" ))


df <- combined %>% mutate(early = ifelse(ARR_DELAY < 0, 1, 0 ))  %>% mutate(ontime = ifelse((ARR_DELAY >=0 & ARR_DELAY<=5), 1,0)) %>% 
  mutate(late = ifelse(ARR_DELAY >5, 1, 0 ))

df <- combined %>% mutate(status = ifelse(ARR_DELAY < 0, -1 , ifelse((ARR_DELAY >= 0 & ARR_DELAY <=5), 0, 1 )))

#http://r.789695.n4.nabble.com/hhmm-time-format-strptime-and-k-td4651208.html
#http://www.noamross.net/blog/2014/2/10/using-times-and-dates-in-r---presentation-code.html
#http://stackoverflow.com/questions/8924133/seq-for-posixct
df$Time <- ifelse(nchar(df$DEP_TIME) == 3, paste0('0', df$DEP_TIME), ifelse(nchar(df$DEP_TIME) == 2,paste0('0','0', df$DEP_TIME), df$DEP_TIME))
df$newTime <- as.POSIXct(df$Time,tz="GMT", format = "%H%M", origin= as.Date("2016-02-16"))
date1 <- as.Date("2016-02-16 ")
my.breaks <- (seq.POSIXt(as.POSIXct(date1), by = "1 hour", length.out = 24,format="%H%M",tz="GMT"))
df$TimeBIn <- cut.POSIXt((df$newTime), breaks = my.breaks)

#
sample_origin <- c("MA")
sample_destination <- c("NY")
sample_months <- c(1,2,3,4,5)

sample_OD <- df[df$MONTH %in% sample_months & df$ORIGIN_STATE_ABR %in% sample_origin , ]
sample_OD$status <- factor(sample_OD$status)
sample_OD$CARRIER <- factor( sample_OD$CARRIER)
sample_OD$DAY_OF_MONTH <- factor( sample_OD$DAY_OF_MONTH)
sample_OD$TimeBIn <- factor(sample_OD$TimeBIn)

sample_OD <- sample_OD %>%  dplyr::select(CARRIER, DAY_OF_MONTH, DEST_STATE_ABR, TimeBIn, DISTANCE, status, MONTH)
# sample_data <- df[df$MONTH %in% sample_months,]
# sample_data$status <- factor(sample_data$status)
#
smp_size <- floor(0.8 * nrow(sample_OD))
train_ind <- sample(seq_len(nrow(sample_OD)), size = smp_size)
training <- sample_OD[train_ind,]
test <- sample_OD[-train_ind,]
# 

plot(sample_OD$status ~  sample_OD$CARRIER) # .
plot(sample_OD$status ~ (sample_OD$MONTH)) # **
plot(sample_OD$status ~ (sample_OD$DAY_OF_MONTH)) # ***
plot(sample_OD$status ~ (sample_OD$TimeBIn)) # ***
plot(sample_OD$status ~ (sample_OD$DISTANCE)) # ***


max(df$DEP_TIME, na.rm = TRUE)
min(df$DEP_TIME, na.rm = TRUE)



# corr plot
m <- cor(sample_OD[, c(3,4,7,11,17,39)], use="complete")
library(corrplot)
corrplot(m, method = "square")
#
# airport ids should be changed to dummy variables, because no "ordering" exists among them. 
#
flights.dummy <- as.data.frame(model.matrix( ~   MONTH +  CARRIER + TimeBIn -1  ,data = sample_data))
sample_data <- subset(sample_data,  !is.na(TimeBIn) )

flights <-data.frame(sample_data$status,  flights.dummy)
colnames(sample_OD)
#0
library(tree)
tree_df <- tree(status ~ . , data = sample_OD) # does not really work
glm.fit <- glm(status ~.  , data = training, family = binomial)
summary(glm.fit)
glm.probs =predict(glm.fit,test, type ="response")
glm.probs[1:10]
contrasts(training$status)
glm.pred <- rep("late", nrow(test))
glm.pred[glm.probs<0.3] = "early"
table(glm.pred, test$status)


(trueNegativeRate <- 1560/(1560 + 826))
(recall <- 3309/(3309 + 1943))
(accuracy <- (1560+3309)/nrow(test) ) # or mean(glm.pred == test$status)
(precision <- 3309/(3309+826))


mean(glm.pred == test$status)
table(test$status)
(prior <- 2336/(2336 + 5302))

library(pROC)
g <- roc(status ~ glm.probs, data = test)
plot(g)
hist(glm.probs)



############### library of code snippets


tree_df <- tree(status ~ MONTH + DAY_OF_MONTH  + CARRIER + ORIGIN_AIRPORT_ID + DEST_AIRPORT_ID  , data = df)
summary(tree_df)
plot(tree_df)
text(tree_df)

rm(tree_df)
#
glm.fit <- glm(status ~ MONTH + DAY_OF_MONTH  + CARRIER + ORIGIN_AIRPORT_ID + DEST_AIRPORT_ID  , data = training, family = binomial)
summary(glm.fit)
glm.probs =predict(glm.fit,test, type ="response")
glm.probs[1:10]
contrasts(training$status)
glm.pred <- rep("late", nrow(test))
glm.pred[glm.probs<0.3] = "early"
table(glm.pred, test$status)

(164 + 648091)/nrow(test) #0.713857
#
median(glm.probs)
#
library(MASS)
lda.fit <- lda(status ~ MONTH + DAY_OF_MONTH  + CARRIER + ORIGIN_AIRPORT_ID + DEST_AIRPORT_ID  , data = training)

lda.fit <- lda(status ~  MONTH + DAY_OF_MONTH  + CARRIER , data = sample_OD)

lda.fit
plot(lda.fit) # what does this show?
lda.pred <- predict(lda.fit, test)
lda.class =lda.pred$class
table(lda.class, test$status)

qda.fit <- qda(status ~ MONTH + DAY_OF_MONTH  + CARRIER + ORIGIN_AIRPORT_ID + DEST_AIRPORT_ID  , data = training)
qda.fit
qda.class =predict(qda.fit ,test)$class
table(qda.class, test$status) # way worse
#
library(class)
train.x <- cbind(training$MONTH, training$DAY_OF_MONTH, training$CARRIER, training$ORIGIN_AIRPORT_ID, training$DEST_AIRPORT_ID )
test.x <- cbind(test$MONTH, test$DAY_OF_MONTH, test$CARRIER, test$ORIGIN_AIRPORT_ID, test$DEST_AIRPORT_ID )
train.status <- training$status

knn.pred <- knn(train.x, test.x, train.status, k )

#
library(ROCR)
#
library(rpart)

df_rp <- rpart(status ~ MONTH + DAY_OF_MONTH  + CARRIER + ORIGIN + DEST + DEP_TIME  , data = training)
predictions <- predict(df_rp, test, type = c("class"))

colnames(df)
rm(df_rp)
nrow(df[df$status==0, ]) # 599,153
nrow(df[df$status==1, ]) #  1,388,250
nrow(df[df$status==-1, ]) # 3,071,315

apropos("confusion")
